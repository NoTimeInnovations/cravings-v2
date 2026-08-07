"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { insertDuNotificationMutation } from "@/api/deliveryUndo";

/**
 * Delivery Undo push notifications.
 *
 * Server-only: the OneSignal REST key must never reach the browser — anyone
 * holding it can push to every install of the app. That is the whole reason
 * this is a server action rather than a fetch from the component.
 */

const ONESIGNAL_API = "https://api.onesignal.com/notifications";

/** Notification channel created natively by the app; carries the custom sound. */
const ANDROID_CHANNEL_ID = "du_default_v1";

export type DuAudience =
  | { type: "all" }
  | { type: "district"; values: string[] }
  | { type: "area"; values: string[] };

export interface DuSendResult {
  ok: boolean;
  recipients?: number;
  notificationId?: string;
  error?: string;
}

/**
 * Builds the OneSignal targeting payload.
 *
 * The app tags every install with `city` and `area` whenever its location
 * resolves (see PushService.setPlaceTags), so district/area targeting is a
 * tag filter. OneSignal requires the filters array to be joined with explicit
 * `OR` operator entries — a bare list is treated as AND and would match
 * nobody once there is more than one value.
 */
function buildTargeting(audience: DuAudience) {
  if (audience.type === "all") {
    return { included_segments: ["Subscribed Users"] };
  }

  const tag = audience.type === "district" ? "city" : "area";
  const values = audience.values.filter(Boolean);
  if (values.length === 0) {
    return { included_segments: ["Subscribed Users"] };
  }

  const filters: Record<string, string>[] = [];
  values.forEach((value, i) => {
    if (i > 0) filters.push({ operator: "OR" });
    filters.push({ field: "tag", key: tag, relation: "=", value });
  });
  return { filters };
}

export async function sendDuNotification(input: {
  title: string;
  message: string;
  audience: DuAudience;
  /** Deep link inside the app, e.g. "/r/kaifan". */
  route?: string | null;
  sentBy?: string | null;
}): Promise<DuSendResult> {
  const appId = process.env.DU_ONESIGNAL_APP_ID;
  const restKey = process.env.DU_ONESIGNAL_REST_KEY;

  if (!appId || !restKey) {
    return {
      ok: false,
      error:
        "OneSignal is not configured. Set DU_ONESIGNAL_APP_ID and DU_ONESIGNAL_REST_KEY.",
    };
  }

  const title = input.title.trim();
  const message = input.message.trim();
  if (!title || !message) {
    return { ok: false, error: "Title and message are both required." };
  }

  const payload: Record<string, unknown> = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    // Targets the app-created channel so the custom sound plays. Note this is
    // `existing_android_channel_id`, not `android_channel_id` — the latter
    // expects a OneSignal dashboard UUID and errors with
    // "Could not find android_channel_id".
    existing_android_channel_id: ANDROID_CHANNEL_ID,
    ...buildTargeting(input.audience),
  };

  if (input.route) {
    payload.data = { du_route: input.route };
  }

  // Log the attempt before sending. A push is irreversible, so the record
  // must exist even if the request dies mid-flight.
  let logId: string | null = null;
  try {
    const logged = await fetchFromHasura(insertDuNotificationMutation, {
      object: {
        title,
        message,
        audience_type: input.audience.type,
        audience_values:
          input.audience.type === "all" ? [] : input.audience.values,
        route: input.route ?? null,
        sent_by: input.sentBy ?? null,
        status: "sending",
      },
    });
    logId = logged?.insert_du_notifications_one?.id ?? null;
  } catch (e) {
    console.error("[deliveryUndo] failed to log notification", e);
  }

  try {
    const res = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        Authorization: `Key ${restKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await res.json()) as {
      id?: string;
      recipients?: number;
      errors?: string[] | Record<string, unknown>;
    };

    const errors = Array.isArray(body.errors) ? body.errors : null;
    if (!res.ok || errors?.length) {
      const error = errors?.join("; ") ?? `OneSignal returned ${res.status}`;
      await patchLog(logId, { status: "failed", error });
      return { ok: false, error };
    }

    await patchLog(logId, {
      status: "sent",
      onesignal_id: body.id ?? null,
      recipients: body.recipients ?? null,
    });

    return {
      ok: true,
      recipients: body.recipients,
      notificationId: body.id,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    await patchLog(logId, { status: "failed", error });
    return { ok: false, error };
  }
}

/** Best-effort log update — a failed write here must not mask the send result. */
async function patchLog(id: string | null, set: Record<string, unknown>) {
  if (!id) return;
  try {
    await fetchFromHasura(
      `mutation PatchDuNotification($id: uuid!, $set: du_notifications_set_input!) {
        update_du_notifications_by_pk(pk_columns: {id: $id}, _set: $set) { id }
      }`,
      { id, set },
    );
  } catch (e) {
    console.error("[deliveryUndo] failed to patch notification log", e);
  }
}

/**
 * Counts how many installs a given audience would reach, so the operator sees
 * the blast radius before committing. Returns null when it cannot be
 * determined — better to show nothing than a wrong number.
 */
export async function estimateDuAudience(
  audience: DuAudience,
): Promise<number | null> {
  const appId = process.env.DU_ONESIGNAL_APP_ID;
  const restKey = process.env.DU_ONESIGNAL_REST_KEY;
  if (!appId || !restKey) return null;

  try {
    // Total subscribers is all OneSignal exposes cheaply; tag-filtered counts
    // would need a full player scan, which is not worth the API budget.
    if (audience.type !== "all") return null;

    const res = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
      headers: { Authorization: `Key ${restKey}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { messageable_players?: number };
    return body.messageable_players ?? null;
  } catch {
    return null;
  }
}
