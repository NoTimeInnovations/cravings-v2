import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getPartnerWabaIntegration,
  deleteMetaTemplate,
} from "@/lib/whatsapp-meta";

const GET_LOCAL = `
  query GetLocalTemplate($id: uuid!) {
    whatsapp_message_templates_by_pk(id: $id) {
      id
      partner_id
      name
      language
      meta_template_id
      status
    }
  }
`;

const DELETE_LOCAL = `
  mutation DeleteLocalTemplate($id: uuid!) {
    delete_whatsapp_message_templates_by_pk(id: $id) {
      id
    }
  }
`;

// DELETE /api/whatsapp/templates/<id>?partnerId=<uuid>
// Calls Meta to delete the template (if it ever made it past DRAFT) and then
// removes the local row. Best-effort on the Meta side: if Meta says the
// template doesn't exist, we still delete locally.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!id || !partnerId) {
    return NextResponse.json(
      { error: "Missing template id or partnerId" },
      { status: 400 },
    );
  }

  try {
    const data = await fetchFromHasura(GET_LOCAL, { id });
    const row = data?.whatsapp_message_templates_by_pk;
    if (!row) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (row.partner_id !== partnerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only call Meta if the template was actually submitted there. DRAFT
    // rows that never reached Meta don't need a remote delete.
    if (row.status !== "DRAFT" && row.meta_template_id) {
      const integration = await getPartnerWabaIntegration(partnerId);
      if (integration?.waba_id && integration.access_token) {
        try {
          await deleteMetaTemplate(
            integration.waba_id,
            integration.access_token,
            row.name,
            row.meta_template_id,
          );
        } catch (e: any) {
          // Meta returns 404 if the template was already removed there.
          // Anything else we surface so the partner can retry.
          const msg = String(e?.message || "");
          if (!msg.includes("404")) {
            return NextResponse.json(
              { error: msg || "Meta refused to delete the template" },
              { status: 502 },
            );
          }
        }
      }
    }

    await fetchFromHasura(DELETE_LOCAL, { id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Delete template failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to delete template" },
      { status: 500 },
    );
  }
}
