"use server";

import Razorpay from "razorpay";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { finalizeCfOrder } from "./cfOrders";
import { revalidateTag } from "./revalidate";
import { getAuthCookie } from "@/app/auth/actions";
import { encryptSecret, tryDecryptSecret, paymentCryptoConfigured } from "@/lib/paymentCrypto";
import {
  razorpayCredsForPartner,
  credsFromRow,
  fetchPartnerCredRow,
  type CredRow,
} from "@/lib/ownRazorpayServer";
import { stripLoneSurrogates } from "@/lib/utf8";

// Partners collect order payments through their OWN Razorpay account. Credentials
// live ENCRYPTED in the DB (partner_payment_credentials, AES-256-GCM ciphertext,
// AAD-bound to the partner id); the plaintext master key RZP_CREDS_MASTER_KEY is
// server-only. Onboarding is config-only via the superadmin screen. The storefront
// renders the Razorpay path off partners.own_razorpay_enabled (a non-secret flag);
// the browser never receives key_secret / webhook_secret (only the publishable
// key_id, returned at order-creation time).
//
// The credential resolver + webhook-secret helper live in the PLAIN server module
// src/lib/ownRazorpayServer.ts so they are never dispatchable as Server Actions.

// The payment (customer-facing) actions below are intentionally callable without
// an admin session — they run during checkout. The CREDENTIAL-MANAGEMENT actions
// (getOwnRazorpayStatus / saveOwnRazorpayCredentials / setOwnRazorpayEnabled) are
// gated, because a "use server" export is a public RPC endpoint and these decide
// where a partner's money goes. A superadmin may manage ANY partner; a partner
// may manage ONLY their own id (auth.id === partnerId). Returns the acting id for
// the audit trail (never trusts a client-supplied actor).
async function requireOwnerOrSuperadmin(partnerId: string): Promise<{ id: string }> {
  const auth = await getAuthCookie();
  if (!auth?.id) throw new Error("Not authorized");
  if (auth.role === "superadmin") return { id: auth.id };
  if (auth.role === "partner" && auth.id === partnerId) return { id: auth.id };
  throw new Error("Not authorized");
}

export async function createRazorpayOrderForPartner(
  partnerId: string,
  orderId: string,
  amount: number, // in rupees (e.g. 299.00)
  customer: { id: string; name: string; phone: string; email?: string },
) {
  const creds = await razorpayCredsForPartner(partnerId);
  if (!creds) {
    return { success: false, error: "Razorpay not enabled for this restaurant" };
  }

  try {
    const rzp = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
    const order = await rzp.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: orderId,
      // Razorpay rejects order creation if any notes value isn't valid UTF-8.
      // Customer-entered names can carry a lone UTF-16 surrogate (half an emoji
      // from a phone keyboard / autofill / paste), which has no UTF-8 encoding —
      // strip those before sending so checkout never fails on bad input.
      notes: {
        order_id: stripLoneSurrogates(orderId),
        customer_id: stripLoneSurrogates(customer.id),
        customer_name: stripLoneSurrogates(customer.name),
        customer_phone: stripLoneSurrogates(customer.phone),
      },
    });

    // Store the Razorpay order id on the local order row so the webhook can map a
    // payment.captured event back to our order (reusing cashfree_order_id as the
    // generic "provider order id"). Also stamp payment_method="razorpay".
    try {
      await fetchFromHasura(
        `mutation SetRazorpayOrderId($id: uuid!, $rzp_order_id: String!) {
          update_orders_by_pk(pk_columns: {id: $id}, _set: { cashfree_order_id: $rzp_order_id, payment_method: "razorpay" }) { id }
        }`,
        { id: orderId, rzp_order_id: order.id },
      );
    } catch (e) {
      console.error("[razorpay] failed to persist rzp_order_id on order", orderId, e);
    }

    console.log(`[razorpay] create-order ok`, "partner=", partnerId, "rzp_order_id=", order.id);

    return {
      success: true,
      rzpOrderId: order.id,
      keyId: creds.keyId, // publishable — safe to send to client
    };
  } catch (error: any) {
    console.error("[razorpay] create-order FAILED", error);
    return {
      success: false,
      error: error?.error?.description || "Failed to create payment order",
    };
  }
}

// Call this server-side after Razorpay checkout.js fires the handler callback.
export async function verifyRazorpayPayment(
  partnerId: string,
  rzpOrderId: string,
  rzpPaymentId: string,
  rzpSignature: string,
) {
  const creds = await razorpayCredsForPartner(partnerId);
  if (!creds) return { success: false, paid: false };
  const generated = crypto
    .createHmac("sha256", creds.keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  // Constant-time compare (both hex digests are the same length).
  const a = Buffer.from(generated, "utf8");
  const b = Buffer.from(rzpSignature || "", "utf8");
  const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);
  console.log(`[razorpay] verify`, "partner=", partnerId, "valid=", isValid, "payment=", rzpPaymentId);

  return { success: true, paid: isValid };
}

// Lightweight mark-paid for the "pay an already-placed order" flow (/order/[id]) —
// records the payment without finalizing / pushing to Petpooja.
export async function markRazorpayOrderPaidSimple(orderId: string, rzpPaymentId?: string) {
  const set: Record<string, any> = { is_paid: true, payment_method: "razorpay" };
  if (rzpPaymentId) set.cashfree_payment_id = rzpPaymentId;
  await fetchFromHasura(
    `mutation MarkRzpPaidSimple($id: uuid!, $set: orders_set_input!) {
      update_orders_by_pk(pk_columns: {id: $id}, _set: $set) { id }
    }`,
    { id: orderId, set },
  );
}

// Run the SAME finalization the Cashfree success path uses: claim idempotently,
// mark paid, push to Petpooja / notify the partner.
export async function markRazorpayOrderPaid(orderId: string, rzpPaymentId: string) {
  await fetchFromHasura(
    `mutation SetRazorpayPaymentMethod($id: uuid!) {
      update_orders_by_pk(pk_columns: {id: $id}, _set: { payment_method: "razorpay" }) { id }
    }`,
    { id: orderId },
  );

  return finalizeCfOrder(orderId, rzpPaymentId);
}

// ── Manage a partner's own-Razorpay credentials (encrypted at rest) ──────────
// Callable by a superadmin (any partner) or the partner themselves (own id only).
// Every call is authorized (requireOwnerOrSuperadmin) and audited with the
// SERVER-derived actor (never a client-supplied value). The UI never gets the
// stored secrets back.

function last4(s: string): string {
  return s.length >= 4 ? s.slice(-4) : s;
}

async function auditCredChange(
  partnerId: string,
  action: string,
  actor: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetchFromHasuraServer(
      `mutation AuditCred($obj: payment_credential_audit_insert_input!) {
        insert_payment_credential_audit_one(object: $obj) { id }
      }`,
      { obj: { partner_id: partnerId, action, actor, details: details || {} } },
    );
  } catch (e) {
    console.warn("[razorpay] audit insert failed", e);
  }
}

export async function getOwnRazorpayStatus(partnerId: string) {
  await requireOwnerOrSuperadmin(partnerId);
  const base = {
    enabled: false,
    hasCredentials: false,
    keyIdLast4: null as string | null,
    hasWebhookSecret: false,
    masterKeyConfigured: paymentCryptoConfigured(),
  };
  if (!partnerId) return base;
  try {
    const data = await fetchFromHasuraServer(
      `query RzpStatus($id: uuid!) {
        partners_by_pk(id: $id) { own_razorpay_enabled }
        partner_payment_credentials_by_pk(partner_id: $id) { key_id key_secret_enc webhook_secret_enc }
      }`,
      { id: partnerId },
    );
    const row = (data as any)?.partner_payment_credentials_by_pk as CredRow | null;
    return {
      enabled: !!(data as any)?.partners_by_pk?.own_razorpay_enabled,
      hasCredentials: !!credsFromRow(row, partnerId),
      keyIdLast4: row?.key_id ? last4(row.key_id) : null,
      hasWebhookSecret: !!tryDecryptSecret(row?.webhook_secret_enc, partnerId),
      masterKeyConfigured: paymentCryptoConfigured(),
    };
  } catch (e) {
    console.error("[razorpay] status lookup failed", e);
    return base;
  }
}

// A BLANK secret field means "keep the existing secret". key_id is always required.
// Secrets are AAD-bound to the partner id before storage.
export async function saveOwnRazorpayCredentials(
  partnerId: string,
  creds: { keyId: string; keySecret?: string; webhookSecret?: string },
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireOwnerOrSuperadmin(partnerId);
  if (!partnerId) return { ok: false, error: "partnerId required" };
  if (!paymentCryptoConfigured()) {
    return { ok: false, error: "RZP_CREDS_MASTER_KEY is not configured on the server" };
  }
  const keyId = (creds.keyId || "").trim();
  if (!keyId) return { ok: false, error: "Key ID is required" };
  try {
    const obj: Record<string, any> = {
      partner_id: partnerId,
      provider: "razorpay",
      key_id: keyId,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    };
    if (creds.keySecret && creds.keySecret.trim()) {
      obj.key_secret_enc = encryptSecret(creds.keySecret.trim(), partnerId);
    }
    if (creds.webhookSecret && creds.webhookSecret.trim()) {
      obj.webhook_secret_enc = encryptSecret(creds.webhookSecret.trim(), partnerId);
    }
    const updateColumns = Object.keys(obj).filter((k) => k !== "partner_id");
    await fetchFromHasuraServer(
      `mutation UpsertRzpCreds(
        $obj: partner_payment_credentials_insert_input!,
        $cols: [partner_payment_credentials_update_column!]!
      ) {
        insert_partner_payment_credentials_one(
          object: $obj,
          on_conflict: { constraint: partner_payment_credentials_pkey, update_columns: $cols }
        ) { partner_id }
      }`,
      { obj, cols: updateColumns },
    );
    await auditCredChange(partnerId, "saved_credentials", admin.id, {
      keyIdLast4: last4(keyId),
      setKeySecret: !!obj.key_secret_enc,
      setWebhookSecret: !!obj.webhook_secret_enc,
    });
    revalidateTag(partnerId);
    return { ok: true };
  } catch (e: any) {
    console.error("[razorpay] save creds failed", e?.message || e);
    return { ok: false, error: "Failed to save credentials" };
  }
}

// Flip the storefront-facing own_razorpay_enabled flag. Enabling is blocked unless
// usable (decryptable) credentials are already stored.
export async function setOwnRazorpayEnabled(
  partnerId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireOwnerOrSuperadmin(partnerId);
  if (!partnerId) return { ok: false, error: "partnerId required" };
  try {
    if (enabled) {
      if (!paymentCryptoConfigured()) {
        return { ok: false, error: "RZP_CREDS_MASTER_KEY is not configured on the server" };
      }
      const usable = credsFromRow(await fetchPartnerCredRow(partnerId), partnerId);
      if (!usable) return { ok: false, error: "Add valid Razorpay credentials before enabling" };
    }
    await fetchFromHasuraServer(
      `mutation SetOwnRzpEnabled($id: uuid!, $en: Boolean!) {
        update_partners_by_pk(pk_columns: { id: $id }, _set: { own_razorpay_enabled: $en }) { id }
      }`,
      { id: partnerId, en: enabled },
    );
    await auditCredChange(partnerId, enabled ? "enabled" : "disabled", admin.id, {});
    revalidateTag(partnerId);
    return { ok: true };
  } catch (e: any) {
    console.error("[razorpay] setEnabled failed", e?.message || e);
    return { ok: false, error: "Failed to update" };
  }
}
