import { NextRequest, NextResponse } from "next/server";
import { getPartnerWabaIntegration } from "@/lib/whatsapp-meta";

// Diagnostic endpoint: returns the granular_scopes Meta currently grants for
// the connected partner's access token. Use this to verify both
// whatsapp_business_messaging and whatsapp_business_management are present —
// they're required for Tech Provider App Review. If only public_profile is
// listed, the Embedded Signup config in Meta Business Manager is missing the
// WhatsApp permissions.
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  const integration = await getPartnerWabaIntegration(partnerId);
  if (!integration?.access_token) {
    return NextResponse.json({ connected: false }, { status: 404 });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "META_APP_ID/SECRET not configured" },
      { status: 500 },
    );
  }
  const appAccessToken = `${appId}|${appSecret}`;

  const res = await fetch(
    `https://graph.facebook.com/v21.0/debug_token?` +
      new URLSearchParams({
        input_token: integration.access_token,
        access_token: appAccessToken,
      }),
  );
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `Meta debug_token returned ${res.status}: ${err}` },
      { status: 502 },
    );
  }
  const data = await res.json();
  const granular = (data.data?.granular_scopes || []).map((s: any) => ({
    scope: s.scope,
    target_ids: s.target_ids || [],
  }));
  const scopes = granular.map((s: any) => s.scope);
  return NextResponse.json({
    connected: true,
    app_id: data.data?.app_id,
    expires_at: data.data?.expires_at,
    is_valid: data.data?.is_valid,
    type: data.data?.type,
    user_id: data.data?.user_id,
    scopes,
    granular_scopes: granular,
    has_messaging: scopes.includes("whatsapp_business_messaging"),
    has_management: scopes.includes("whatsapp_business_management"),
  });
}
