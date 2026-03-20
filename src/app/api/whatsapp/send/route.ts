import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const { phone, text } = await request.json();

    if (!phone || !text) {
      return NextResponse.json(
        { error: "phone and text are required" },
        { status: 400 }
      );
    }

    const success = await sendWhatsAppMessage(phone, text);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send WhatsApp message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
