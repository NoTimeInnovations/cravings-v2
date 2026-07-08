import { NextRequest, NextResponse } from "next/server";
import { getPartnerWabaIntegrations, partnerWabaToken } from "@/lib/whatsapp-meta";

const GRAPH = "https://graph.facebook.com/v21.0";

// GET /api/whatsapp/meta/name-status?partnerId=<uuid>
// Returns the Meta display-name review state for EVERY number a partner has
// connected, keyed by phone_number_id. Kept separate from /status (a pure DB
// query on a hot path) so the number list renders instantly and these Graph
// calls populate the badges lazily. Each lookup is best-effort — a failed
// number is simply omitted from the map.
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  const integrations = await getPartnerWabaIntegrations(partnerId);
  if (!integrations.length) {
    return NextResponse.json({ connected: false, names: {} });
  }

  const entries = await Promise.all(
    integrations.map(async (i) => {
      if (!i.phone_number_id) return null;
      try {
        const res = await fetch(
          `${GRAPH}/${i.phone_number_id}?` +
            new URLSearchParams({
              fields: "name_status,verified_name",
              access_token: partnerWabaToken(i),
            }),
        );
        const data = await res.json();
        if (!res.ok) return null;
        return [
          i.phone_number_id,
          {
            // APPROVED | AVAILABLE_WITHOUT_REVIEW | PENDING_REVIEW |
            // DECLINED | EXPIRED | NONE
            nameStatus: data?.name_status ?? null,
            verifiedName: data?.verified_name ?? null,
          },
        ] as const;
      } catch {
        return null;
      }
    }),
  );

  const names: Record<string, { nameStatus: string | null; verifiedName: string | null }> =
    {};
  for (const e of entries) {
    if (e) names[e[0]] = e[1];
  }

  return NextResponse.json({ connected: true, names });
}
