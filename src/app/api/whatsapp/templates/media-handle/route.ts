import { NextRequest, NextResponse } from "next/server";
import {
  getPartnerWabaIntegration,
  partnerWabaToken,
  uploadMediaToMetaForTemplate,
} from "@/lib/whatsapp-meta";

// POST /api/whatsapp/templates/media-handle
// Body: { partnerId, url, fileType? }
// Takes an already-uploaded media URL (e.g. our S3 link), fetches the bytes, and
// runs Meta's Resumable Upload to return the { handle } that a template media
// HEADER needs (example.header_handle). Uses the partner's WABA token so the
// handle is valid for the same partner's createMetaTemplate call.
export const runtime = "nodejs";

const MAX_BYTES = 16 * 1024 * 1024; // Meta: image/doc small; video kept ≤5MB by the editor.

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, url, fileType } = body || {};
  if (!partnerId || !url || typeof url !== "string") {
    return NextResponse.json(
      { error: "Missing partnerId or url" },
      { status: 400 },
    );
  }

  const integration = await getPartnerWabaIntegration(partnerId);
  if (!integration?.waba_id || !integration.access_token) {
    return NextResponse.json(
      { error: "Connect your WhatsApp Business Account before uploading media." },
      { status: 412 },
    );
  }

  try {
    const mediaRes = await fetch(url);
    if (!mediaRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch media (${mediaRes.status})` },
        { status: 400 },
      );
    }
    const type =
      (typeof fileType === "string" && fileType) ||
      mediaRes.headers.get("content-type") ||
      "application/octet-stream";
    const buf = Buffer.from(await mediaRes.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json({ error: "Empty media file" }, { status: 400 });
    }
    if (buf.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Media too large for a template header (max 16MB)" },
        { status: 400 },
      );
    }

    const handle = await uploadMediaToMetaForTemplate(
      buf,
      type,
      partnerWabaToken(integration),
      "header-media",
    );
    return NextResponse.json({ handle });
  } catch (e: any) {
    console.error("[templates/media-handle] failed", e);
    return NextResponse.json(
      { error: e?.message || "Failed to upload media to Meta" },
      { status: 500 },
    );
  }
}
