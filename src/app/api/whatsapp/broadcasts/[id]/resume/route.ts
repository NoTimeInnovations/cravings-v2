import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// POST /api/whatsapp/broadcasts/[id]/resume  body: { partnerId }
// Re-arms a paused broadcast (paused → scheduled). The cron worker continues
// sending the remaining recipients, subject to the daily 250 cap. scheduled_at
// is reset to now so it's picked up on the next tick.
const RESUME = `
  mutation ResumeBroadcast($id: uuid!, $partner_id: uuid!, $now: timestamptz!) {
    update_whatsapp_broadcasts(
      where: {
        id: { _eq: $id }
        partner_id: { _eq: $partner_id }
        status: { _eq: "paused" }
      }
      _set: { status: "scheduled", scheduled_at: $now, last_error: null, locked_at: null, updated_at: $now }
    ) {
      affected_rows
    }
  }
`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let partnerId: string | undefined;
  try {
    partnerId = (await req.json())?.partnerId;
  } catch {
    partnerId = req.nextUrl.searchParams.get("partnerId") || undefined;
  }
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }
  try {
    const data = await fetchFromHasura(RESUME, {
      id,
      partner_id: partnerId,
      now: new Date().toISOString(),
    });
    const affected = data?.update_whatsapp_broadcasts?.affected_rows || 0;
    if (!affected) {
      return NextResponse.json(
        { error: "Only paused broadcasts can be resumed" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Resume broadcast failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to resume" },
      { status: 500 },
    );
  }
}
