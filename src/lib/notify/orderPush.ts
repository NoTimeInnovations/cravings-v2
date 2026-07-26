/**
 * Server-only push path for *partner-facing* order alerts.
 *
 * Two copies of this logic already exist:
 *   - `Notification` / `getMessage` in `src/app/actions/notification.ts` — that
 *     module is "use client", so its exports are `undefined` when imported into
 *     a server module and it can never be used from a route handler.
 *   - `notifyPartnerNewOrder` in `src/app/actions/cfOrders.ts` — an inline
 *     server-side duplicate written for exactly that reason.
 *
 * This module is the reusable server version: it resolves the partner's device
 * tokens with the *server-only* Hasura admin secret (via `hasuraServerClient`),
 * builds the same FCM-shaped payload the notification microservice expects, and
 * posts it. It runs with no browser present, which is what crons need. The two
 * copies above can later be folded onto this — they are intentionally left
 * alone for now.
 *
 * Never throws: callers are fire-and-forget side paths (crons, webhooks) that
 * must not fail because a push failed.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import TEST_PARTNERS from "@/utils/testPartnerAccounts";

const NOTIFICATION_SERVER_URL =
  process.env.NOTIFICATION_SERVER_URL ||
  "https://notification-server-khaki.vercel.app";

/**
 * Partner devices. NOTE `device_tokens.user_id` is TEXT while `orders.partner_id`
 * is uuid, so the partner id must be passed as `String!` here (not `uuid!`).
 * Newest 5 only — mirrors `notifyPartnerNewOrder`; older tokens are stale
 * re-installs that FCM would reject anyway.
 */
const PARTNER_DEVICE_TOKENS_QUERY = `
  query GetPartnerDeviceTokens($partnerId: String!) {
    device_tokens(
      where: { user_id: { _eq: $partnerId } }
      order_by: { created_at: desc }
      limit: 5
    ) {
      device_token
    }
  }
`;

export interface PartnerPushInput {
  partnerId: string;
  title: string;
  body: string;
  /** Deep link opened on tap. Defaults to the partner dashboard. */
  url?: string;
  /** Extra FCM `data` keys (e.g. order_id, type). Merged over the defaults. */
  data?: Record<string, string>;
  /**
   * Android/iOS channel. Partner + order alerts use the loud
   * `cravings_channel_1` (custom sound); customer/marketing pushes use
   * `cravings_channel_2`. Defaults to the loud one.
   */
  channelId?: string;
}

export interface PartnerPushResult {
  ok: boolean;
  /** Number of device tokens the message was dispatched to. */
  recipients: number;
  /** True when the send was intentionally skipped (test partner / no devices). */
  skipped?: boolean;
  error?: string;
}

/**
 * Resolve the partner's devices and dispatch a push. Returns `{ok:true,
 * recipients:0, skipped:true}` when there is nothing to send to (no devices, or
 * a test account) — that is not an error.
 */
export async function sendPartnerPush(
  input: PartnerPushInput
): Promise<PartnerPushResult> {
  const partnerId = input.partnerId;
  const title = input.title?.trim();
  const body = input.body?.trim();

  if (!partnerId || !title || !body) {
    return { ok: false, recipients: 0, error: "missing partnerId, title or body" };
  }

  // Never push from test accounts (mirrors sendBroadcast / AdminV2Notify).
  if (TEST_PARTNERS.includes(partnerId)) {
    return { ok: true, recipients: 0, skipped: true };
  }

  let tokens: string[];
  try {
    const { device_tokens } = await fetchFromHasuraServer(
      PARTNER_DEVICE_TOKENS_QUERY,
      { partnerId }
    );
    tokens = Array.from(
      new Set(
        (device_tokens || [])
          .map((t: { device_token?: string | null }) => t.device_token)
          .filter(Boolean) as string[]
      )
    );
  } catch (err: any) {
    console.error(
      `[sendPartnerPush] token resolution failed partner=${partnerId}:`,
      err?.message || err
    );
    return {
      ok: false,
      recipients: 0,
      error: `token resolution failed: ${err?.message || err}`,
    };
  }

  if (tokens.length === 0) {
    return { ok: true, recipients: 0, skipped: true };
  }

  const channelId = input.channelId || "cravings_channel_1";
  const message = {
    tokens,
    notification: { title, body },
    android: {
      priority: "high" as const,
      notification: {
        icon: "ic_stat_logo",
        channelId,
        sound: "custom_sound",
      },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "custom_sound.caf", contentAvailable: true } },
    },
    data: {
      url: input.url || "https://menuthere.com/admin-v2",
      channel_id: channelId,
      sound: "custom_sound.caf",
      ...(input.data || {}),
    },
  };

  try {
    const res = await fetch(`${NOTIFICATION_SERVER_URL}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, partner_id: partnerId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error =
        err?.error || `notification server returned ${res.status}`;
      console.error(`[sendPartnerPush] partner=${partnerId}:`, error);
      return { ok: false, recipients: tokens.length, error };
    }
  } catch (err: any) {
    console.error(
      `[sendPartnerPush] request failed partner=${partnerId}:`,
      err?.message || err
    );
    return {
      ok: false,
      recipients: tokens.length,
      error: `notification server request failed: ${err?.message || err}`,
    };
  }

  return { ok: true, recipients: tokens.length };
}
