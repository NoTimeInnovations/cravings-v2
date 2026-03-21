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

    // 2. Get WABA ID and Phone Number ID from the token
    const { wabaId, phoneNumberId } = await getConnectedWabaInfo(access_token);

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
    });

    // 5. Redirect back to the app
    const host = request.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";

    if (redirectUrl) {
      const decodedRedirect = decodeURIComponent(redirectUrl);
      return NextResponse.redirect(
        `${protocol}://${host}${decodedRedirect}?whatsapp_connected=true`,
      );
    }

    // Default redirect to admin settings
    return NextResponse.redirect(
      `${protocol}://${host}/admin-v2/settings?whatsapp_connected=true`,
    );
  } catch (error: any) {
    console.error("WhatsApp OAuth Error:", error);

    const host = request.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";

    return NextResponse.redirect(
      `${protocol}://${host}/admin-v2/settings?whatsapp_error=${encodeURIComponent(error.message)}`,
    );
  }
}
