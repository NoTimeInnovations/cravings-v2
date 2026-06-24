import { NextRequest, NextResponse } from "next/server";
import {
  getPartnerWabaIntegration,
  partnerWabaToken,
} from "@/lib/whatsapp-meta";
import { countSentToday, tierToDailyLimit } from "@/lib/whatsapp-broadcast";
import { getBusinessCurrency } from "@/lib/whatsapp-cost";

const GRAPH = "https://graph.facebook.com/v21.0";

// GET /api/whatsapp/meta/phone-quality?partnerId=<uuid>
// Reports the partner WABA number's quality rating + messaging limit tier, the
// daily broadcast cap and today's usage, the business display currency, and a
// best-effort Meta-confirmed spend for the current month (pricing_analytics).
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  const integration = await getPartnerWabaIntegration(partnerId);
  if (!integration?.phone_number_id) {
    return NextResponse.json({ connected: false });
  }
  const token = partnerWabaToken(integration);

  // Run number-node + usage + currency together; pricing_analytics is best-effort.
  const [phoneRes, sentToday, currency, actualSpend] = await Promise.all([
    fetchPhoneNode(integration.phone_number_id, token),
    countSentToday(partnerId).catch(() => 0),
    getBusinessCurrency(partnerId).catch(() => "INR"),
    fetchMonthSpend(integration.waba_id, token).catch(() => null),
  ]);

  // The daily cap tracks the number's real Meta tier ("q number") — TIER_250 →
  // 250, TIER_1K → 1000, etc. `remaining` is what can still be sent today.
  const dailyLimit = tierToDailyLimit(
    phoneRes.ok ? phoneRes.data?.messagingLimitTier : null,
  );
  const remaining = Math.max(0, dailyLimit - sentToday);

  return NextResponse.json({
    connected: true,
    currency,
    usage: { sentToday, dailyLimit, remaining },
    phone: phoneRes.ok ? phoneRes.data : null,
    phoneError: phoneRes.ok ? null : phoneRes.error,
    actualSpend, // { amount, currency, periodLabel } | null
  });
}

async function fetchPhoneNode(
  phoneNumberId: string,
  token: string,
): Promise<
  | { ok: true; data: any }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      `${GRAPH}/${phoneNumberId}?` +
        new URLSearchParams({
          fields:
            "verified_name,display_phone_number,quality_rating,messaging_limit_tier,throughput,name_status,code_verification_status,platform_type",
          access_token: token,
        }),
    );
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `Meta ${res.status}` };
    }
    return {
      ok: true,
      data: {
        verifiedName: data?.verified_name ?? null,
        displayPhoneNumber: data?.display_phone_number ?? null,
        qualityRating: data?.quality_rating ?? null, // GREEN | YELLOW | RED
        messagingLimitTier: data?.messaging_limit_tier ?? null, // TIER_250 | TIER_1K | ...
        throughputLevel: data?.throughput?.level ?? null,
        nameStatus: data?.name_status ?? null,
        codeVerificationStatus: data?.code_verification_status ?? null,
        platformType: data?.platform_type ?? null,
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "phone fetch failed" };
  }
}

// Best-effort: Meta's actual billed spend for the WABA this month, in its billing
// currency. The field/permission may be unavailable; callers treat null as "use
// the rate-card estimate instead".
async function fetchMonthSpend(
  wabaId: string,
  token: string,
): Promise<{ amount: number; currency: string | null; periodLabel: string } | null> {
  if (!wabaId) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000;
  const end = Math.floor(now.getTime() / 1000);
  const field = `pricing_analytics.start(${Math.floor(start)}).end(${end}).granularity(MONTHLY)`;
  try {
    const res = await fetch(
      `${GRAPH}/${wabaId}?` +
        new URLSearchParams({ fields: field, access_token: token }),
    );
    const data = await res.json();
    if (!res.ok) return null;
    const points: any[] =
      data?.pricing_analytics?.data?.flatMap((d: any) => d?.data_points || []) ||
      [];
    if (!points.length) return null;
    let amount = 0;
    let currency: string | null = null;
    for (const p of points) {
      const c = Number(p?.cost ?? 0);
      if (!Number.isNaN(c)) amount += c;
      currency = currency || p?.currency || null;
    }
    const periodLabel = now.toLocaleDateString("en", {
      month: "long",
      year: "numeric",
    });
    return { amount: Math.round(amount * 100) / 100, currency, periodLabel };
  } catch {
    return null;
  }
}
