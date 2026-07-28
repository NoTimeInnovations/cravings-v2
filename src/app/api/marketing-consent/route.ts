import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { normalizeForPartner, identityKey } from "@/lib/comeback/phone";

export const dynamic = "force-dynamic";

/**
 * Record (or withdraw) a customer's consent to receive marketing from ONE
 * restaurant.
 *
 * Per-partner on purpose. Agreeing to hear from the place you order biryani from
 * is not agreement to hear from everyone else on the platform — and because 32
 * partners here send from a single WhatsApp number, a platform-wide flag would
 * make one restaurant's opt-in look like permission for all of them.
 *
 * The exact wording the customer agreed to is stored alongside the consent, so
 * years later it is answerable what they actually said yes to rather than just
 * that a boolean was set.
 */

const PARTNER = `
  query ConsentPartner($id: uuid!) { partners_by_pk(id: $id) { country country_code } }
`;

const UPSERT = `
  mutation UpsertConsent($object: marketing_consent_insert_input!) {
    insert_marketing_consent_one(
      object: $object
      on_conflict: {
        constraint: marketing_consent_partner_identity_key
        update_columns: [granted_at, revoked_at, source, consent_text, phone]
      }
    ) { id }
  }
`;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { partnerId, phone, granted, consentText, source } = body || {};
  if (!partnerId || !phone) {
    return NextResponse.json({ error: "partnerId and phone required" }, { status: 400 });
  }

  try {
    const p = await fetchFromHasuraServer(PARTNER, { id: partnerId });
    const partner = p?.partners_by_pk;
    if (!partner) return NextResponse.json({ error: "partner_not_found" }, { status: 404 });

    const n = normalizeForPartner(String(phone), partner);
    if (!n.ok) return NextResponse.json({ error: "bad_phone", reason: n.reason }, { status: 400 });

    const now = new Date().toISOString();
    await fetchFromHasuraServer(UPSERT, {
      object: {
        partner_id: partnerId,
        identity_key: identityKey(n.value.e164),
        phone: n.value.e164,
        source: source || "checkout",
        granted_at: now,
        // Withdrawal is a revoked_at stamp rather than a deleted row: the record
        // that consent once existed is exactly what makes it auditable.
        revoked_at: granted === false ? now : null,
        consent_text: consentText || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[marketing-consent] failed:", e?.message || e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
