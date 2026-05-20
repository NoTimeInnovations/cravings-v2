import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getPartnerWabaIntegration,
  deleteMetaTemplate,
  editMetaTemplate,
  MetaTemplateNotFoundError,
  type MetaTemplateComponent,
} from "@/lib/whatsapp-meta";

const GET_LOCAL = `
  query GetLocalTemplate($id: uuid!) {
    whatsapp_message_templates_by_pk(id: $id) {
      id
      partner_id
      name
      language
      category
      meta_template_id
      status
    }
  }
`;

const UPDATE_LOCAL = `
  mutation UpdateLocalTemplate(
    $id: uuid!
    $category: String!
    $components: jsonb!
    $status: String!
    $rejection_reason: String
  ) {
    update_whatsapp_message_templates_by_pk(
      pk_columns: { id: $id }
      _set: {
        category: $category
        components: $components
        status: $status
        rejection_reason: $rejection_reason
      }
    ) {
      id
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
          // If Meta says the template doesn't exist there (404 or "not
          // found" subcode), it's already gone — fall through and delete
          // the local row. Anything else (auth, rate limit, etc.) we
          // surface so the partner can retry.
          if (!(e instanceof MetaTemplateNotFoundError)) {
            return NextResponse.json(
              { error: e?.message || "Meta refused to delete the template" },
              { status: 502 },
            );
          }
          console.warn(
            `Template ${row.name} already missing at Meta — deleting local row anyway.`,
          );
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

// PATCH /api/whatsapp/templates/<id>?partnerId=<uuid>
// Body: { category, components }
// Edits a template at Meta and mirrors the change locally. Only allowed for
// APPROVED or REJECTED templates — PENDING templates can't be edited per
// Meta's rules, and DRAFT templates were never submitted. Name + language
// stay immutable.
export async function PATCH(
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { category, components } = body || {};
  if (!category || !Array.isArray(components)) {
    return NextResponse.json(
      { error: "Missing category or components" },
      { status: 400 },
    );
  }
  if (!["UTILITY", "MARKETING", "AUTHENTICATION"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
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
    if (!["APPROVED", "REJECTED"].includes(row.status)) {
      return NextResponse.json(
        {
          error:
            row.status === "PENDING"
              ? "Pending templates can't be edited. Wait for Meta's review."
              : "Only approved or rejected templates can be edited.",
        },
        { status: 409 },
      );
    }
    if (!row.meta_template_id) {
      return NextResponse.json(
        { error: "Template was never submitted to Meta; recreate it instead." },
        { status: 409 },
      );
    }

    const integration = await getPartnerWabaIntegration(partnerId);
    if (!integration?.access_token) {
      return NextResponse.json(
        { error: "WhatsApp Business Account is not connected." },
        { status: 412 },
      );
    }

    await editMetaTemplate(row.meta_template_id, integration.access_token, {
      category,
      components: components as MetaTemplateComponent[],
    });

    // Meta puts the template back into review. Reflect that locally so the
    // partner doesn't think the change is live yet.
    await fetchFromHasura(UPDATE_LOCAL, {
      id,
      category,
      components,
      status: "PENDING",
      rejection_reason: null,
    });

    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch (e: any) {
    console.error("Edit template failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to edit template" },
      { status: 400 },
    );
  }
}
