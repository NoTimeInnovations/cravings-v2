import { NextRequest, NextResponse } from "next/server";
import { sendCancellationRequestEmail } from "@/lib/email";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { partnerIdQuery } from "@/api/auth";

export async function POST(req: NextRequest) {
    try {
        const { partnerId, reason } = await req.json();

        if (!partnerId) {
            return NextResponse.json({ error: "Partner ID required" }, { status: 400 });
        }

        // Fetch partner details to ensure accuracy
        // We reused partnerIdQuery from src/api/auth.ts
        const { partners_by_pk: partner } = await fetchFromHasura(partnerIdQuery, { id: partnerId });

        if (!partner) {
            return NextResponse.json({ error: "Partner not found" }, { status: 404 });
        }

        await sendCancellationRequestEmail({
            partnerName: partner.name || partner.store_name || "Unknown",
            partnerId: partner.id,
            partnerEmail: partner.email,
            reason: reason || "No reason provided",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Cancellation request error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
