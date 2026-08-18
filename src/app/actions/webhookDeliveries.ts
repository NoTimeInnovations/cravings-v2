"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";

/**
 * Recent webhook delivery attempts for the signed-in partner.
 *
 * Exists because, until now, "did my webhook fire?" was unanswerable by anyone
 * — us included. deliverWebhook returned {ok,status} and every caller threw it
 * away, so a failed delivery left no trace at all and the only way to
 * investigate was to reason about code paths.
 *
 * Partner comes from the session cookie, never an argument: this returns the
 * endpoint URL a partner configured, which is not another partner's business.
 */

export type WebhookDelivery = {
  id: string;
  event: string;
  delivery_id: string;
  order_id: string | null;
  attempt: number;
  status_code: number | null;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
  is_test: boolean;
  created_at: string;
};

export async function listWebhookDeliveries(
  limit = 20,
): Promise<{ ok: true; deliveries: WebhookDelivery[] } | { ok: false; message: string }> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "partner" || !auth.id) {
    return { ok: false, message: "Not authorized" };
  }
  try {
    const data: any = await fetchFromHasuraServer(
      `query WebhookDeliveries($p: uuid!, $limit: Int!) {
         webhook_deliveries(
           where: { partner_id: { _eq: $p } }
           order_by: { created_at: desc }
           limit: $limit
         ) {
           id event delivery_id order_id attempt status_code ok error duration_ms is_test created_at
         }
       }`,
      { p: auth.id, limit: Math.min(Math.max(limit, 1), 100) },
    );
    return { ok: true, deliveries: (data?.webhook_deliveries || []) as WebhookDelivery[] };
  } catch (e) {
    console.error("listWebhookDeliveries failed", e);
    return { ok: false, message: "Could not load delivery history." };
  }
}
