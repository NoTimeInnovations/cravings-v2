import { NextRequest, NextResponse } from "next/server";
import { getPartnerWabaIntegration, partnerWabaToken } from "@/lib/whatsapp-meta";

const GRAPH = "https://graph.facebook.com/v21.0";

// GET /api/whatsapp/meta/health?partnerId=<uuid>
// Reports the partner WABA's Meta account state — business verification +
// messaging/payment health — so the UI can explain why OTP/authentication
// templates or proactive sends are blocked. Uses the partner's own Embedded
// Signup token (partnerWabaToken) — the Tech Provider per-customer token with a
// role on their WABA; our system-user token has none and returns 100/33.
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  const integration = await getPartnerWabaIntegration(partnerId);
  if (!integration?.waba_id) {
    return NextResponse.json({ connected: false });
  }

  try {
    const res = await fetch(
      `${GRAPH}/${integration.waba_id}?` +
        new URLSearchParams({
          fields:
            "id,name,account_review_status,business_verification_status,health_status",
          access_token: partnerWabaToken(integration),
        }),
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({
        connected: true,
        error: data?.error?.message || `Meta returned ${res.status}`,
      });
    }

    const health = data?.health_status;
    const entities: any[] = health?.entities || [];
    const issues = entities.flatMap((e) =>
      (e.errors || []).map((err: any) => ({
        entity: e.entity_type,
        canSend: e.can_send_message,
        code: err.error_code,
        description: err.error_description,
        solution: err.possible_solution,
      })),
    );

    const businessVerified =
      data?.business_verification_status === "verified";

    return NextResponse.json({
      connected: true,
      name: data?.name ?? null,
      accountReviewStatus: data?.account_review_status ?? null,
      businessVerified,
      businessVerificationStatus: data?.business_verification_status ?? null,
      canSendMessage: health?.can_send_message ?? "UNKNOWN",
      issues,
      // Convenience flags for the UI.
      paymentIssue: issues.some((i: any) => i.code === 141006),
      verificationIssue:
        !businessVerified || issues.some((i: any) => i.code === 141010),
      canCreateAuthTemplates: businessVerified,
    });
  } catch (e: any) {
    return NextResponse.json({
      connected: true,
      error: e?.message || "Health check failed",
    });
  }
}
