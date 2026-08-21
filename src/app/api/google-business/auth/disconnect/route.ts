import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Disconnect a partner's Google Business Profile.
//   { partnerId } → revoke the grant at Google, then clear the stored tokens.
//
// Clearing the row locally is not enough on its own: the refresh token would
// keep working at Google, so anyone holding a copy could mint fresh access
// tokens after the partner believed they had disconnected. We revoke first,
// then clear.
//
// The row itself is KEPT (as is `location_id`), so reconnecting with the same
// Google account resumes pushing to the same listing without re-picking it.
// If the partner reconnects with a DIFFERENT Google account, that stale
// location_id will fail the push with a 404 and they need to re-link — a loud
// failure, not a silent wrong-listing write.
export async function POST(req: NextRequest) {
  try {
    const { partnerId } = await req.json();

    if (!partnerId) {
      return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
    }

    const existing = await fetchFromHasura(
      `query GoogleIntegration($partner_id: uuid!) {
        google_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
          id
          access_token
          refresh_token
        }
      }`,
      { partner_id: partnerId },
    );

    const row = existing?.google_business_integrations?.[0];
    if (!row) {
      // Already disconnected — nothing to undo. Idempotent by design: the UI
      // may fire this twice, and a partner who never connected should not see
      // an error for asking to be disconnected.
      return NextResponse.json({ success: true, alreadyDisconnected: true });
    }

    // Revoking the refresh token invalidates every access token minted from it.
    // Fall back to the access token when no refresh token was ever stored.
    const tokenToRevoke = row.refresh_token || row.access_token;
    let revoked = false;
    let revokeError: string | null = null;

    if (tokenToRevoke) {
      try {
        const res = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: tokenToRevoke }).toString(),
        });
        // Google answers 400 `invalid_token` for a grant that is already gone
        // (user revoked it from their Google account page, token expired past
        // its refresh window). That is the state we wanted, so treat it as
        // success rather than blocking the local clear.
        revoked = res.ok;
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if (/invalid_token/i.test(body)) {
            revoked = true;
          } else {
            revokeError = body.slice(0, 300) || `HTTP ${res.status}`;
            console.error("[google-business] revoke failed:", revokeError);
          }
        }
      } catch (e: any) {
        revokeError = e?.message || "revoke request failed";
        console.error("[google-business] revoke threw:", e);
      }
    }

    // Clear credentials regardless of the revoke outcome. A partner who asked
    // to disconnect must stop being connected in our system even if Google is
    // unreachable; the stale grant is reported back so it can be chased.
    await fetchFromHasura(
      `mutation ClearGoogleTokens($id: uuid!, $now: timestamptz!) {
        update_google_business_integrations_by_pk(
          pk_columns: {id: $id}
          _set: {access_token: null, refresh_token: null, token_expiry: null, updated_at: $now}
        ) { id }
      }`,
      { id: row.id, now: new Date().toISOString() },
    );

    return NextResponse.json({ success: true, revoked, revokeError });
  } catch (error: any) {
    console.error("Google Business disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
