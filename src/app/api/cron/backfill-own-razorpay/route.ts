import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "@/app/actions/revalidate";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { encryptSecret, paymentCryptoConfigured } from "@/lib/paymentCrypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ONE-TIME backfill: migrate the legacy env-based own-Razorpay partners into the
 * encrypted DB store (partner_payment_credentials) and enable them. Runs in the
 * Vercel runtime so it can read the still-configured {SLUG}_* env vars AND encrypt
 * with the real server-only RZP_CREDS_MASTER_KEY (guaranteeing prod can decrypt).
 * Idempotent: skips any partner that already has a credentials row. Remove this
 * route + its vercel.json cron entry once the backfill is confirmed.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (Vercel sends it automatically).
 */
const SLUGS = ["FLAMIN", "REGU", "HIGHJOINT", "FOODOUT"];

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!paymentCryptoConfigured()) {
    return NextResponse.json({ error: "RZP_CREDS_MASTER_KEY not set" }, { status: 500 });
  }

  const results: Record<string, string> = {};
  for (const slug of SLUGS) {
    const partnerId = (process.env[`${slug}_PARTNER_ID`] || "").trim();
    const keyId = (process.env[`${slug}_RAZORPAY_KEY_ID`] || "").trim();
    const keySecret = (process.env[`${slug}_RAZORPAY_KEY_SECRET`] || "").trim();
    const webhookSecret = (process.env[`${slug}_RAZORPAY_WEBHOOK_SECRET`] || "").trim();
    if (!partnerId || !keyId || !keySecret) {
      results[slug] = "skipped: env missing (partner_id / key_id / key_secret)";
      continue;
    }
    try {
      const existing = (await fetchFromHasuraServer(
        `query Ex($id: uuid!) { partner_payment_credentials_by_pk(partner_id: $id) { partner_id } }`,
        { id: partnerId },
      )) as any;
      if (existing?.partner_payment_credentials_by_pk) {
        results[slug] = "skipped: already backfilled";
        continue;
      }

      const obj: Record<string, any> = {
        partner_id: partnerId,
        provider: "razorpay",
        key_id: keyId,
        key_secret_enc: encryptSecret(keySecret, partnerId),
        updated_by: "backfill",
        updated_at: new Date().toISOString(),
      };
      if (webhookSecret) obj.webhook_secret_enc = encryptSecret(webhookSecret, partnerId);
      const cols = Object.keys(obj).filter((k) => k !== "partner_id");

      await fetchFromHasuraServer(
        `mutation Up($obj: partner_payment_credentials_insert_input!, $cols: [partner_payment_credentials_update_column!]!) {
          insert_partner_payment_credentials_one(object: $obj, on_conflict: { constraint: partner_payment_credentials_pkey, update_columns: $cols }) { partner_id }
        }`,
        { obj, cols },
      );
      await fetchFromHasuraServer(
        `mutation En($id: uuid!) { update_partners_by_pk(pk_columns: { id: $id }, _set: { own_razorpay_enabled: true }) { id } }`,
        { id: partnerId },
      );
      await fetchFromHasuraServer(
        `mutation Audit($obj: payment_credential_audit_insert_input!) { insert_payment_credential_audit_one(object: $obj) { id } }`,
        { obj: { partner_id: partnerId, action: "backfilled_from_env", actor: "backfill-cron", details: { slug, hasWebhook: !!webhookSecret } } },
      );
      try { await revalidateTag(partnerId); } catch { /* deploy-time cache bust covers it */ }
      results[slug] = `backfilled + enabled (webhook: ${webhookSecret ? "yes" : "no"})`;
    } catch (e: any) {
      results[slug] = `error: ${e?.message || String(e)}`;
    }
  }
  return NextResponse.json({ ok: true, results });
}
