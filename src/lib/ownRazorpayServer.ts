// SERVER-ONLY, PLAIN module (NOT "use server") — so these helpers are never
// registered as dispatchable Server Actions / reachable as public RPC endpoints.
// Reads encrypted partner Razorpay credentials from the DB and decrypts them with
// the server-only master key. Imported by the razorpay server actions and the
// webhook route. (fetchFromHasuraServer throws if evaluated in a browser context,
// so importing this into client code fails fast.)
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { tryDecryptSecret } from "@/lib/paymentCrypto";

export type CredRow = {
  key_id?: string | null;
  key_secret_enc?: string | null;
  webhook_secret_enc?: string | null;
};
export type PartnerRzpCreds = { keyId: string; keySecret: string };

// Raw credential row (no `enabled` gate) — for the superadmin status + enable-guard.
export async function fetchPartnerCredRow(partnerId: string): Promise<CredRow | null> {
  const data = await fetchFromHasuraServer(
    `query RzpCredRow($id: uuid!) {
      partner_payment_credentials_by_pk(partner_id: $id) { key_id key_secret_enc webhook_secret_enc }
    }`,
    { id: partnerId },
  );
  return (data as any)?.partner_payment_credentials_by_pk ?? null;
}

// Decrypt + validate a cred row into usable creds, or null. AAD = partnerId so a
// ciphertext copied into a different partner's row won't decrypt.
export function credsFromRow(row: CredRow | null, partnerId: string): PartnerRzpCreds | null {
  const keyId = (row?.key_id || "").trim();
  const keySecret = row?.key_secret_enc
    ? (tryDecryptSecret(row.key_secret_enc, partnerId) || "").trim()
    : "";
  return keyId && keySecret ? { keyId, keySecret } : null;
}

// Resolve a partner's Razorpay creds. Returns creds ONLY when own-Razorpay is
// ENABLED and a usable key id + decryptable secret exist.
export async function razorpayCredsForPartner(partnerId: string): Promise<PartnerRzpCreds | null> {
  if (!partnerId) return null;
  try {
    const data = await fetchFromHasuraServer(
      `query RzpCreds($id: uuid!) {
        partners_by_pk(id: $id) { own_razorpay_enabled }
        partner_payment_credentials_by_pk(partner_id: $id) { key_id key_secret_enc }
      }`,
      { id: partnerId },
    );
    if (!(data as any)?.partners_by_pk?.own_razorpay_enabled) return null;
    return credsFromRow((data as any)?.partner_payment_credentials_by_pk, partnerId);
  } catch (e) {
    console.error("[razorpay] creds lookup failed", partnerId, e);
    return null;
  }
}

// Every configured partner's webhook secret (decrypted per-partner with its id as
// AAD) — the shared /api/fhc/razorpay webhook tries each. NOT gated on `enabled`
// so a late webhook for a just-disabled partner still verifies.
export async function allRazorpayWebhookSecrets(): Promise<string[]> {
  try {
    const data = await fetchFromHasuraServer(
      `query AllRzpWebhookSecrets {
        partner_payment_credentials(where: { webhook_secret_enc: { _is_null: false } }) {
          partner_id
          webhook_secret_enc
        }
      }`,
    );
    const rows = (data as any)?.partner_payment_credentials || [];
    return rows
      .map((r: any) => (tryDecryptSecret(r.webhook_secret_enc, r.partner_id) || "").trim())
      .filter(Boolean);
  } catch (e) {
    console.error("[razorpay] webhook secrets lookup failed", e);
    return [];
  }
}
