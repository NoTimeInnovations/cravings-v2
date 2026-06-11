/**
 * Server-only broadcast send path for the partner "Notify" feature.
 *
 * This is the server-side mirror of the client logic in
 * `src/components/admin-v2/AdminV2Notify.tsx`. It resolves recipient device
 * tokens and posts to the notification microservice using the *server-only*
 * Hasura admin secret (via `hasuraServerClient`), so it can run with no browser
 * present — which is exactly what scheduled / recurring notifications need.
 *
 * Shared by:
 *   - immediate "send now" (server action wrapper)
 *   - the dispatcher cron that fires due scheduled_notifications
 *
 * Tokens are resolved here, at fire time — never snapshotted when a schedule is
 * created — so recipients are always current.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import TEST_PARTNERS from "@/utils/testPartnerAccounts";

export type NotifyAudience = "app" | "followers";

export interface BroadcastInput {
  partnerId: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: NotifyAudience;
  /** Optional — looked up server-side if omitted (used to build the deep link). */
  partnerUsername?: string | null;
}

export interface BroadcastResult {
  ok: boolean;
  /** Number of device tokens the message was dispatched to. */
  recipients: number;
  /** True when the send was intentionally skipped (e.g. a test partner). */
  skipped?: boolean;
  error?: string;
}

const NOTIFICATION_SERVER_URL =
  process.env.NOTIFICATION_SERVER_URL ||
  "https://notification-server-khaki.vercel.app";

const APP_INSTALL_TOKENS_QUERY = `
  query GetPartnerAppInstalls($partnerId: uuid!) {
    app_installs(where: { partner_id: { _eq: $partnerId } }) {
      device_token
    }
  }
`;

const FOLLOWER_IDS_QUERY = `
  query GetPartnerFollowerIds($partnerId: uuid!) {
    followers(where: { partner_id: { _eq: $partnerId } }) {
      user_id
    }
  }
`;

const DEVICE_TOKENS_QUERY = `
  query GetUserDeviceTokens($userIds: [String!]!, $partnerId: uuid!) {
    device_tokens(
      where: { user_id: { _in: $userIds }, partner_id: { _eq: $partnerId } }
    ) {
      device_token
    }
  }
`;

const PARTNER_USERNAME_QUERY = `
  query GetPartnerUsername($partnerId: uuid!) {
    partners_by_pk(id: $partnerId) {
      username
    }
  }
`;

const uniqueTokens = (rows: Array<{ device_token?: string | null }> | null) =>
  Array.from(
    new Set((rows || []).map((r) => r.device_token).filter(Boolean) as string[])
  );

/**
 * Resolve the recipient device tokens for the chosen audience.
 *   - "app":        every install of this partner's app (app_installs), incl.
 *                   users who never logged in or followed.
 *   - "followers":  only users who tapped Follow and have a device token.
 */
export async function resolveBroadcastTokens(
  audience: NotifyAudience,
  partnerId: string
): Promise<string[]> {
  if (audience === "app") {
    const { app_installs } = await fetchFromHasuraServer(
      APP_INSTALL_TOKENS_QUERY,
      { partnerId }
    );
    return uniqueTokens(app_installs);
  }

  const { followers } = await fetchFromHasuraServer(FOLLOWER_IDS_QUERY, {
    partnerId,
  });
  const userIds: string[] = (followers || []).map((f: any) => f.user_id);
  if (userIds.length === 0) return [];

  const { device_tokens } = await fetchFromHasuraServer(DEVICE_TOKENS_QUERY, {
    userIds,
    partnerId,
  });
  return uniqueTokens(device_tokens);
}

async function getPartnerUsername(partnerId: string): Promise<string | null> {
  try {
    const { partners_by_pk } = await fetchFromHasuraServer(
      PARTNER_USERNAME_QUERY,
      { partnerId }
    );
    return partners_by_pk?.username ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve recipients and dispatch a broadcast push. Returns the recipient count
 * (0 with ok:true when there are no reachable devices — not an error) or an
 * error string on send failure. Never throws.
 */
export async function sendBroadcast(
  input: BroadcastInput
): Promise<BroadcastResult> {
  const { partnerId, audience } = input;
  const title = input.title?.trim();
  const body = input.body?.trim();
  const imageUrl = input.imageUrl?.trim() || "";

  if (!partnerId || !title || !body) {
    return { ok: false, recipients: 0, error: "missing partnerId, title or body" };
  }

  // Never push from test accounts (mirrors AdminV2Notify).
  if (TEST_PARTNERS.includes(partnerId)) {
    return { ok: true, recipients: 0, skipped: true };
  }

  let tokens: string[];
  try {
    tokens = await resolveBroadcastTokens(audience, partnerId);
  } catch (err: any) {
    return {
      ok: false,
      recipients: 0,
      error: `token resolution failed: ${err?.message || err}`,
    };
  }

  if (tokens.length === 0) {
    return { ok: true, recipients: 0 };
  }

  const username =
    input.partnerUsername ?? (await getPartnerUsername(partnerId));
  const targetUrl = username
    ? `https://menuthere.com/${username}`
    : "https://menuthere.com";

  const message = {
    tokens,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    android: {
      priority: "high" as const,
      notification: {
        icon: "ic_stat_logo",
        channelId: "cravings_channel_2",
        sound: "default_sound",
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "default_sound", contentAvailable: true } },
      ...(imageUrl ? { fcm_options: { image: imageUrl } } : {}),
    },
    data: {
      url: targetUrl,
      channel_id: "cravings_channel_2",
      sound: "default_sound",
      type: "broadcast",
      partner_id: partnerId,
      ...(imageUrl ? { image: imageUrl } : {}),
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
      return {
        ok: false,
        recipients: tokens.length,
        error: err?.error || `notification server returned ${res.status}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      recipients: tokens.length,
      error: `notification server request failed: ${err?.message || err}`,
    };
  }

  return { ok: true, recipients: tokens.length };
}
