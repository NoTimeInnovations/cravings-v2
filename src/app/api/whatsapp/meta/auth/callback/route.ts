import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getConnectedWabaInfo,
  subscribeWabaWebhooks,
  saveWhatsAppIntegration,
} from "@/lib/whatsapp-meta";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    // Parse state — contains partnerId and optional redirect
    const stateRaw = searchParams.get("state");
    let partnerId: string | null = null;
    let redirectUrl: string | null = null;

    if (stateRaw) {
      try {
        const parsed = JSON.parse(stateRaw);
        partnerId = parsed.partnerId;
        redirectUrl = parsed.redirect;
      } catch {
        // Fallback: state is just the partnerId string
        partnerId = stateRaw;
      }
    }

    if (!partnerId) {
      return NextResponse.json(
        { error: "Missing partnerId in state" },
        { status: 400 },
      );
    }

    // 1. Exchange code for access token
    const { access_token } = await exchangeCodeForToken(code);

    // 2. Get WABA ID, Phone Number ID, and Meta user_id from the token. The
    //    Meta user_id is what Meta sends in the Data Deletion Callback's
    //    signed_request — we have to persist it now so we can look the
    //    partner up later by that id.
    const { wabaId, phoneNumberId, metaUserId } =
      await getConnectedWabaInfo(access_token);

    console.log("--- WhatsApp Business Connected ---");
    console.log("Partner ID:", partnerId);
    console.log("WABA ID:", wabaId);
    console.log("Phone Number ID:", phoneNumberId);

    // 3. Subscribe this WABA to our webhooks
    await subscribeWabaWebhooks(wabaId, access_token);

    // 4. Save integration to Hasura
    await saveWhatsAppIntegration({
      partner_id: partnerId,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      access_token,
      meta_user_id: metaUserId,
    });

    // 5. Redirect back to the app
    const host = request.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";

    const base = `${protocol}://${host}`;
    const decodedRedirect = redirectUrl
      ? decodeURIComponent(redirectUrl)
      : "/admin-v2/settings";
    // Use URL so we set ?whatsapp_connected=true correctly even when the
    // redirect path already has its own query string (e.g. /admin-v2?view=Settings) —
    // string concat would produce a second "?" and corrupt the existing params.
    const target = new URL(decodedRedirect, base);
    target.searchParams.set("whatsapp_connected", "true");
    return NextResponse.redirect(target.toString());
  } catch (error: any) {
    console.error("WhatsApp OAuth Error:", error);

    const host = request.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";

    return NextResponse.redirect(
      `${protocol}://${host}/admin-v2/settings?whatsapp_error=${encodeURIComponent(error.message)}`,
    );
  }
}
