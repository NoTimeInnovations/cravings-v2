import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { runOrderTriggeredFlows } from "@/lib/whatsappFlow/engine";

// Receives the Hasura event trigger on `orders` (INSERT/UPDATE). On a new order
// or a status change it fires the partner's matching order-triggered WhatsApp
// flows, injecting the order context as variables.
export const maxDuration = 30;

const Q_ORDER = `
  query OrderForFlow($id: uuid!) {
    orders_by_pk(id: $id) {
      id display_id short_id status total_price type table_name phone orderedby partner_id
      gst_included extra_charges discounts loyalty_redeem_value loyalty_points_redeemed
      delivery_agent delivery_provider_meta
      delivery_boy { name phone }
      partner { store_name currency }
      user { full_name phone }
      order_items { quantity item menu { name price } }
    }
  }
`;
const Q_PHONE_NUMBER_ID = `
  query Pnid($p: uuid!) {
    whatsapp_business_integrations(where: {partner_id: {_eq: $p}}, limit: 1) { phone_number_id }
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

// Money rounded to 2 decimals with trailing zeros trimmed (250 -> "250", 52.5 -> "52.5").
function fmtMoney(n: number): string {
  if (!isFinite(n)) return "0";
  return String(Math.round(n * 100) / 100);
}

export async function POST(req: NextRequest) {
  // Auth: the Hasura event trigger sends a shared secret header (set to the
  // webhook verify token — a server-only secret). Reject anything else so a
  // forged request can't drive sends.
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
    const newRow = ev?.data?.new;
    const oldRow = ev?.data?.old;
    if (!newRow?.id) return NextResponse.json({ ok: true });

    // "placed" fires on a new order; otherwise fire on the new status value.
    let fireStatus: string | null = null;
    if (op === "INSERT") fireStatus = "placed";
    else if (op === "UPDATE" && newRow.status && newRow.status !== oldRow?.status) {
      fireStatus = newRow.status;
    }
    if (!fireStatus) return NextResponse.json({ ok: true });

    const partnerId = newRow.partner_id;
    if (!partnerId) return NextResponse.json({ ok: true });

    // The partner must have a connected WhatsApp number to send from.
    const pnidRes = await fetchFromHasura(Q_PHONE_NUMBER_ID, { p: partnerId });
    const phoneNumberId =
      pnidRes?.whatsapp_business_integrations?.[0]?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ ok: true });

    const ordRes = await fetchFromHasura(Q_ORDER, { id: newRow.id });
    const order = ordRes?.orders_by_pk;
    if (!order) return NextResponse.json({ ok: true });

    const customerRaw = order.phone || order.user?.phone;
    if (!customerRaw) return NextResponse.json({ ok: true });
    const customerPhone = normalizePhone(customerRaw);
    if (customerPhone.length < 11) return NextResponse.json({ ok: true });

    const currency = order.partner?.currency ?? "₹";

    // ── Full bill, reconstructed from the persisted order columns ──
    // Items with per-line price; subtotal = Σ(price × qty). gst_included,
    // extra_charges (named delivery/parcel/QR lines), discount savings and
    // loyalty redemption are read straight off the order row; `total` is the
    // authoritative persisted grand total.
    const lineItems = (order.order_items || []).map((oi: any, i: number) => {
      const it = oi.item || {};
      const name = it.name || oi.menu?.name || "Item";
      const qty = Number(oi.quantity) || 0;
      const price = Number(it.price ?? oi.menu?.price ?? 0);
      const line = price * qty;
      return { label: `${i + 1}. ${name} × ${qty} — ${currency}${fmtMoney(line)}`, line };
    });
    const items = lineItems.map((l: any) => l.label).join("\n");
    const subtotalNum = lineItems.reduce((s: number, l: any) => s + l.line, 0);

    const chargeLines: string[] = [];
    if (Array.isArray(order.extra_charges)) {
      for (const c of order.extra_charges) {
        const amt = Number(c?.amount) || 0;
        if (amt) chargeLines.push(`${c?.name || "Charge"}: ${currency}${fmtMoney(amt)}`);
      }
    }

    let discountNum = 0;
    if (Array.isArray(order.discounts)) {
      for (const d of order.discounts) discountNum += Number(d?.savings) || 0;
    }

    const gstNum = Number(order.gst_included) || 0;
    const loyaltyVal = Number(order.loyalty_redeem_value) || 0;
    const totalNum = Number(order.total_price) || 0;

    const billLines: string[] = [`Subtotal: ${currency}${fmtMoney(subtotalNum)}`];
    if (gstNum > 0) billLines.push(`GST: ${currency}${fmtMoney(gstNum)}`);
    billLines.push(...chargeLines);
    if (discountNum > 0) billLines.push(`Discount: -${currency}${fmtMoney(discountNum)}`);
    if (loyaltyVal > 0) billLines.push(`Points redeemed: -${currency}${fmtMoney(loyaltyVal)}`);
    billLines.push(`*Total: ${currency}${fmtMoney(totalNum)}*`);

    // ── Order link + driver / tracking (for placed & dispatched flows) ──
    // The order page resolves the order UUID, so the link uses order.id.
    const orderUrl = `https://menuthere.com/order/${order.id}`;

    // Driver may come from the partner's own rider, the Adloggs agent, or the
    // Porter/bridge provider meta — first non-empty wins. All optional.
    const dpm: any =
      order.delivery_provider_meta && typeof order.delivery_provider_meta === "object"
        ? order.delivery_provider_meta
        : {};
    const da: any =
      order.delivery_agent && typeof order.delivery_agent === "object" ? order.delivery_agent : {};
    const driverName = String(
      order.delivery_boy?.name || da.name || dpm.driver?.name || "",
    ).trim();
    const driverPhone = String(
      order.delivery_boy?.phone || da.phone || dpm.driver?.phone || "",
    ).trim();

    // Tracking link: provider meta trackUrl, else a Porter share link extracted
    // from shareText. Must be a real http(s) URL or the button degrades to text.
    let trackingUrl = typeof dpm.trackUrl === "string" ? dpm.trackUrl.trim() : "";
    if (!trackingUrl && typeof dpm.shareText === "string") {
      const m = dpm.shareText.match(/porter\.in\/rd\/[a-z0-9]+/i);
      if (m) trackingUrl = `https://${m[0]}`;
    }
    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) trackingUrl = "";

    // A ready-to-drop block, blank when no driver is assigned yet.
    let driverDetails = "";
    if (driverName || driverPhone) {
      driverDetails = `\n\n🛵 *Rider:* ${driverName || "Assigned"}`;
      if (driverPhone) driverDetails += `\n📞 ${driverPhone}`;
    }

    const variables = {
      store_name: order.partner?.store_name || "",
      order_id: order.display_id || order.short_id || String(order.id).slice(0, 8),
      order_status: fireStatus,
      customer_name: order.user?.full_name || order.orderedby || "Customer",
      items,
      subtotal: `${currency}${fmtMoney(subtotalNum)}`,
      gst: gstNum > 0 ? `${currency}${fmtMoney(gstNum)}` : "",
      charges: chargeLines.join("\n"),
      discount: discountNum > 0 ? `-${currency}${fmtMoney(discountNum)}` : "",
      total: `${currency}${fmtMoney(totalNum)}`,
      bill: billLines.join("\n"),
      order_url: orderUrl,
      driver_name: driverName,
      driver_phone: driverPhone,
      driver_details: driverDetails,
      tracking_url: trackingUrl,
      order_type: order.type || "",
      currency,
    };

    await runOrderTriggeredFlows({
      partnerId,
      phoneNumberId,
      orderId: order.id,
      status: fireStatus,
      customerPhone,
      variables,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Order-event flow error:", e);
    return NextResponse.json({ ok: true });
  }
}
