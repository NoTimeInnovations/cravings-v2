import { NextRequest, NextResponse } from "next/server";
import { generateAndUploadImages } from "@/backend_auto_image_gen";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { partnerId, items, email } = body;

        if (!partnerId || !items || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Trigger background process without awaiting
        generateAndUploadImages(partnerId, items, email).catch(err => {
            console.error("Background process error:", err);
        });

        return NextResponse.json({ success: true, message: "Started background image generation" });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
