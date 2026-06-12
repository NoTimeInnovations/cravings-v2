import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { runLoyaltyTriggeredFlows } from "@/lib/whatsappFlow/engine";
import { getFeatures } from "@/lib/getFeatures";
import { parseLoyaltySettings, pointsToValue } from "@/lib/loyalty/config";

// Receives the Hasura event trigger on `loyalty_transactions` (INSERT only —
// the ledger is append-only). When a customer is credited or spends points it
// fires the partner's matching loyalty-triggered WhatsApp flows, injecting the
// loyalty context as variables. Only partners with the loyalty feature enabled
// and a connected WhatsApp number ever send.
export const maxDuration = 30;

// Map a ledger transaction type to the loyalty flow event it fires. Only
// point-adding credits ("earned") and customer spends ("redeemed") notify;
// refunds and manual debits are silent to avoid confusing messages.
const TYPE_TO_EVENT: Record<string, string | undefined> = {
  earn: "earned",
  adjust_credit: "earned",
  redeem: "redeemed",
};

const Q_CTX = `
  query LoyaltyCtx($pid: uuid!, $uid: uuid!, $aid: uuid!) {
    partners_by_pk(id: $pid) { store_name currency feature_flags loyalty_settings }
    users_by_pk(id: $uid) { full_name phone }
    loyalty_accounts_by_pk(id: $aid) { lifetime_earned }
    whatsapp_business_integrations(where: { partner_id: { _eq: $pid } }, limit: 1) { phone_number_id }
  }
`;
const Q_ORDER_DISPLAY = `
  query OrderDisplay($id: uuid!) {
    orders_by_pk(id: $id) { display_id short_id }
  }
`;

function normalizePhone(raw: string): string {
  let p = String(raw || "").replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "91" + p.slice(1);
  if (p.length === 10) p = "91" + p;
  return p;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  // Auth: the Hasura event trigger sends a shared secret header (the webhook
  // verify token — a server-only secret). Reject anything else so a forged
  // request can't drive sends.
  const token = req.headers.get("x-flow-event-token") || "";
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || "";
  if (!expected || !safeEqual(token, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const ev = body?.event;
    const op = ev?.op;
    const row = ev?.data?.new;
    if (op !== "INSERT" || !row?.id) return NextResponse.json({ ok: true });

    const event = TYPE_TO_EVENT[String(row.type || "")];
    if (!event) return NextResponse.json({ ok: true }); // refund / debit → silent

    const partnerId = row.partner_id;
    const userId = row.user_id;
    const accountId = row.account_id;
    if (!partnerId || !userId || !accountId) return NextResponse.json({ ok: true });

    const ctx = await fetchFromHasura(Q_CTX, { pid: partnerId, uid: userId, aid: accountId });
    const partner = ctx?.partners_by_pk;
    const user = ctx?.users_by_pk;
    if (!partner || !user) return NextResponse.json({ ok: true });

    // Gate: only loyalty-enabled partners. The trigger is table-wide, so a
    // partner who later turns loyalty off must stop notifying.
    const features = getFeatures(partner.feature_flags || null);
    if (!features.loyalty_points?.access || !features.loyalty_points?.enabled) {
      return NextResponse.json({ ok: true });
    }

    // The partner must have a connected WhatsApp number to send from.
    const phoneNumberId = ctx?.whatsapp_business_integrations?.[0]?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ ok: true });

    const customerRaw = user.phone;
    if (!customerRaw) return NextResponse.json({ ok: true });
    const customerPhone = normalizePhone(customerRaw);
    if (customerPhone.length < 11) return NextResponse.json({ ok: true });

    const settings = parseLoyaltySettings(partner.loyalty_settings);
    const currency = partner.currency ?? "₹";
    const points = Math.abs(Number(row.delta) || 0);
    const balance = Number(row.balance_after) || 0;
    const lifetimeEarned = ctx?.loyalty_accounts_by_pk?.lifetime_earned ?? "";

    // Resolve a friendly order id when the transaction is tied to an order.
    let orderIdLabel = "";
    if (row.order_id) {
      try {
        const o = await fetchFromHasura(Q_ORDER_DISPLAY, { id: row.order_id });
        const od = o?.orders_by_pk;
        orderIdLabel = od?.display_id || od?.short_id || String(row.order_id).slice(0, 8);
      } catch {
        orderIdLabel = String(row.order_id).slice(0, 8);
      }
    }

    const variables = {
      store_name: partner.store_name || "",
      customer_name: user.full_name || "Customer",
      points: String(points),
      points_value: `${currency}${pointsToValue(points, settings)}`,
      points_balance: String(balance),
      balance_value: `${currency}${pointsToValue(balance, settings)}`,
      lifetime_earned: String(lifetimeEarned),
      order_id: orderIdLabel,
      currency,
    };

    await runLoyaltyTriggeredFlows({
      partnerId,
      phoneNumberId,
      txnId: row.id,
      event,
      customerPhone,
      variables,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Loyalty-event flow error:", e);
    return NextResponse.json({ ok: true });
  }
}
