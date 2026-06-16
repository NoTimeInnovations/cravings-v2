import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// POST /api/whatsapp/broadcasts/[id]/cancel  body: { partnerId }
// Cancels a scheduled / sending / paused broadcast. Already-completed or
// already-cancelled broadcasts are left untouched.
const CANCEL = `
  mutation CancelBroadcast($id: uuid!, $partner_id: uuid!, $now: timestamptz!) {
    update_whatsapp_broadcasts(
      where: {
        id: { _eq: $id }
        partner_id: { _eq: $partner_id }
        status: { _in: ["scheduled", "sending", "paused"] }
      }
      _set: { status: "cancelled", locked_at: null, updated_at: $now }
    ) {
      affected_rows
      returning { id status }
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
    const data = await fetchFromHasura(CANCEL, {
      id,
      partner_id: partnerId,
      now: new Date().toISOString(),
    });
    const affected = data?.update_whatsapp_broadcasts?.affected_rows || 0;
    if (!affected) {
      return NextResponse.json(
        { error: "Broadcast can't be cancelled (already finished or not found)" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Cancel broadcast failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to cancel" },
      { status: 500 },
    );
  }
}
