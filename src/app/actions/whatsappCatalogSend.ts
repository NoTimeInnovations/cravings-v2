"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  buildProductListMessage,
  countListedItems,
  MAX_PRODUCT_LIST_ITEMS,
  type ProductSection,
} from "@/lib/whatsappProductMessage";

/**
 * Send a partner's catalogue into a WhatsApp conversation.
 *
 * This is the half of Shape A that was missing: the catalogue existed and could
 * receive carts, but nothing could put dishes in front of a customer. Without
 * it the feature is only visible to someone who already knows to tap the
 * catalogue icon.
 *
 * ── The 24-hour window ────────────────────────────────────────────────────────
 *
 * Interactive messages are session messages: Meta only delivers them inside the
 * 24h customer-service window opened by the customer's own last message. There
 * is no template equivalent for product_list, so a partner cannot cold-send a
 * catalogue. The error is surfaced verbatim rather than swallowed, because
 * "nothing happened" is indistinguishable from "the number is wrong".
 */

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

const SEND_CONTEXT = `
  query CatalogSendContext($id: uuid!) {
    partners_by_pk(id: $id) {
      id
      store_name
      wa_catalog_id
      feature_flags
    }
    whatsapp_business_integrations(
      where: { partner_id: { _eq: $id } }
      order_by: { is_primary: desc }
      limit: 1
    ) {
      phone_number_id
      access_token
      display_phone
    }
    menu(
      where: {
        partner_id: { _eq: $id }
        deletion_status: { _eq: 0 }
        is_available: { _eq: true }
        wa_catalog_synced_at: { _is_null: false }
        # The partner's DECISION, not the bookkeeping stamp. Filtering on
        # synced_at alone made "removed from WhatsApp" depend on a column any
        # write path can set, so a stale stamp would put a dish Meta no longer
        # holds back into a customer message as a blank row.
        wa_catalog_excluded: { _eq: false }
      }
      order_by: { priority: asc }
    ) {
      id
      name
      category { name }
    }
  }
`;

export interface CatalogSendResult {
  ok: boolean;
  message?: string;
  /** How many dishes the message actually carries after Meta's 30-item cap. */
  sent?: number;
  /** How many were eligible, so the caller can say "30 of 124". */
  eligible?: number;
  messageId?: string;
}

/** Local digits -> the country-qualified form Meta wants as `to`. Mirrors the
 *  webhook's normalizePhone; kept local so a change there cannot silently alter
 *  who a partner's catalogue gets sent to. */
function toWaRecipient(input: string): string | null {
  const digits = String(input || "").replace(/\D+/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Send the catalogue as a product_list to one customer.
 *
 * Only items already IN the catalogue are offered: sending a
 * product_retailer_id Meta does not hold renders an empty row in the customer's
 * chat, which looks like a broken shop rather than a missing dish.
 */
export async function sendCatalogueToCustomer(
  partnerId: string,
  toPhone: string,
  opts?: { body?: string },
): Promise<CatalogSendResult> {
  if (!partnerId) return { ok: false, message: "partnerId required" };

  const to = toWaRecipient(toPhone);
  if (!to) return { ok: false, message: "Enter a valid phone number." };

  let data: any;
  try {
    data = await fetchFromHasura(SEND_CONTEXT, { id: partnerId });
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }

  const partner = data?.partners_by_pk;
  if (!partner) return { ok: false, message: "partner not found" };
  if (!String(partner.feature_flags || "").includes("whatsappcatalog-true")) {
    return { ok: false, message: "WhatsApp Catalogue is not enabled for this store." };
  }
  if (!partner.wa_catalog_id) {
    return { ok: false, message: "No catalogue yet — press Sync first." };
  }

  const integ = data?.whatsapp_business_integrations?.[0];
  if (!integ?.phone_number_id || !integ?.access_token) {
    return { ok: false, message: "No WhatsApp number connected for this store." };
  }

  // Group by category so the list is browsable rather than 30 undifferentiated
  // rows. Category order follows menu priority, which is the order the partner
  // already arranged their menu in.
  const byCategory = new Map<string, string[]>();
  for (const m of data?.menu ?? []) {
    const cat = m?.category?.name || "Menu";
    const arr = byCategory.get(cat) ?? [];
    arr.push(m.id);
    byCategory.set(cat, arr);
  }
  const sections: ProductSection[] = [...byCategory].map(([title, retailerIds]) => ({
    // Category names are stored lowercase_underscore — see CLAUDE.md.
    title: title.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    retailerIds,
  }));

  const eligible = sections.reduce((s, x) => s + x.retailerIds.length, 0);
  if (!eligible) {
    return {
      ok: false,
      message: "Nothing to send yet — no synced, available items. Press Sync first.",
    };
  }

  const storeName = partner.store_name || "our kitchen";
  const msg = buildProductListMessage({
    to,
    catalogId: partner.wa_catalog_id,
    headerText: storeName,
    body:
      opts?.body?.trim() ||
      `Here's our menu 🍽️ Tap to browse, add what you'd like to your basket, and send it back to us.`,
    footer: eligible > MAX_PRODUCT_LIST_ITEMS ? `Showing ${MAX_PRODUCT_LIST_ITEMS} of ${eligible}` : null,
    sections,
  });
  if (!msg) return { ok: false, message: "Could not build the catalogue message." };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${integ.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // The PARTNER's token. Ours has no role on their WABA and 100/33s.
          Authorization: `Bearer ${integ.access_token}`,
        },
        body: JSON.stringify(msg),
        signal: AbortSignal.timeout(30_000),
      },
    );
    const body = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      const err = body?.error ?? {};
      // 131047 = outside the 24h window. Say what to do about it; the raw Meta
      // wording ("Message failed to send because more than 24 hours have
      // passed") does not tell a restaurant owner what action to take.
      const friendly =
        err?.code === 131047 || /24 hours/i.test(String(err?.message || ""))
          ? "That customer hasn't messaged you in the last 24 hours, so WhatsApp won't let us send them a catalogue. Ask them to message you first, then try again."
          : err?.error_user_msg || err?.message || `HTTP ${res.status}`;
      return { ok: false, message: friendly };
    }
    return {
      ok: true,
      sent: countListedItems(sections),
      eligible,
      messageId: body?.messages?.[0]?.id,
    };
  } catch (err) {
    return { ok: false, message: `network: ${(err as Error).message}` };
  }
}
