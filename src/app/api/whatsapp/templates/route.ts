import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  getPartnerWabaIntegration,
  partnerWabaToken,
  listMetaTemplates,
  createMetaTemplate,
  type MetaTemplatePayload,
  type MetaTemplateComponent,
} from "@/lib/whatsapp-meta";

const LIST_LOCAL = `
  query ListLocalTemplates($partner_id: uuid!) {
    whatsapp_message_templates(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
    ) {
      id
      name
      language
      category
      components
      status
      meta_template_id
      rejection_reason
      created_at
      updated_at
    }
  }
`;

const INSERT_LOCAL = `
  mutation InsertTemplate($object: whatsapp_message_templates_insert_input!) {
    insert_whatsapp_message_templates_one(object: $object) {
      id
    }
  }
`;

const UPDATE_LOCAL_STATUS = `
  mutation UpdateLocalTemplateStatus(
    $id: uuid!
    $status: String!
    $meta_template_id: String
    $rejection_reason: String
  ) {
    update_whatsapp_message_templates_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        meta_template_id: $meta_template_id
        rejection_reason: $rejection_reason
      }
    ) {
      id
    }
  }
`;

const DELETE_STALE_LOCAL = `
  mutation DeleteStaleTemplates($ids: [uuid!]!) {
    delete_whatsapp_message_templates(where: { id: { _in: $ids } }) {
      affected_rows
    }
  }
`;

// GET /api/whatsapp/templates?partnerId=<uuid>&sync=1
// Returns local rows. If sync=1 and the partner has a WABA integration,
// also pulls the current state from Meta and reconciles statuses/ids.
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  const sync = req.nextUrl.searchParams.get("sync") === "1";
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  try {
    if (sync) {
      const integration = await getPartnerWabaIntegration(partnerId);
      if (integration?.waba_id && integration.access_token) {
        try {
          const metaTemplates = await listMetaTemplates(
            integration.waba_id,
            partnerWabaToken(integration),
          );
          await reconcileWithMeta(partnerId, metaTemplates);
        } catch (e: any) {
          // Sync is best-effort — never block the list view.
          console.warn("Template sync failed:", e?.message || e);
        }
      }
    }

    const data = await fetchFromHasura(LIST_LOCAL, { partner_id: partnerId });
    return NextResponse.json({
      templates: data?.whatsapp_message_templates || [],
    });
  } catch (e: any) {
    console.error("List templates failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load templates" },
      { status: 500 },
    );
  }
}

// POST /api/whatsapp/templates
// Body: { partnerId, name, language, category, components }
// Creates the row locally as DRAFT, submits to Meta, then updates the row
// with PENDING (or APPROVED/REJECTED if Meta auto-resolved synchronously).
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, name, language, category, components } = body || {};
  if (!partnerId || !name || !language || !category || !Array.isArray(components)) {
    return NextResponse.json(
      { error: "Missing partnerId, name, language, category, or components" },
      { status: 400 },
    );
  }
  if (!["UTILITY", "MARKETING", "AUTHENTICATION"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const integration = await getPartnerWabaIntegration(partnerId);
  if (!integration?.waba_id || !integration.access_token) {
    return NextResponse.json(
      { error: "Connect your WhatsApp Business Account before creating templates." },
      { status: 412 },
    );
  }

  // Insert a DRAFT row first so we have an id to update once Meta responds.
  let localId: string;
  try {
    const inserted = await fetchFromHasura(INSERT_LOCAL, {
      object: {
        partner_id: partnerId,
        name,
        language,
        category,
        components,
        status: "DRAFT",
      },
    });
    localId = inserted?.insert_whatsapp_message_templates_one?.id;
    if (!localId) throw new Error("Local insert returned no id");
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { error: "A template with this name and language already exists." },
        { status: 409 },
      );
    }
    console.error("Insert local template failed:", e);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }

  // Submit to Meta.
  try {
    const payload: MetaTemplatePayload = {
      name,
      language,
      category,
      components: components as MetaTemplateComponent[],
    };
    const metaRes = await createMetaTemplate(
      integration.waba_id,
      partnerWabaToken(integration),
      payload,
    );
    await fetchFromHasura(UPDATE_LOCAL_STATUS, {
      id: localId,
      status: metaRes?.status || "PENDING",
      meta_template_id: metaRes?.id || null,
      rejection_reason: null,
    });
    return NextResponse.json({
      id: localId,
      meta_template_id: metaRes?.id,
      status: metaRes?.status || "PENDING",
    });
  } catch (e: any) {
    // Keep the DRAFT row but record the rejection reason so the partner
    // can fix and resubmit without losing the components they typed.
    await fetchFromHasura(UPDATE_LOCAL_STATUS, {
      id: localId,
      status: "REJECTED",
      meta_template_id: null,
      rejection_reason: e?.message || "Meta rejected the template",
    }).catch(() => {});
    return NextResponse.json(
      { error: e?.message || "Meta rejected the template", id: localId },
      { status: 400 },
    );
  }
}

// Meta returns `rejected_reason: "NONE"` (a literal string, not null) for
// templates that haven't been rejected — drop that so we don't surface a
// fake "Rejected: NONE" in the UI.
function normalizeRejectedReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === "NONE") return null;
  return trimmed;
}

// Reconcile local templates with whatever Meta currently has. Local rows
// matched by (name + language) get their status/meta_template_id/rejection
// updated. Templates that exist on Meta but not locally are inserted so the
// partner sees everything tied to their WABA.
async function reconcileWithMeta(
  partnerId: string,
  metaTemplates: Awaited<ReturnType<typeof listMetaTemplates>>,
) {
  const data = await fetchFromHasura(LIST_LOCAL, { partner_id: partnerId });
  const local = (data?.whatsapp_message_templates || []) as Array<{
    id: string;
    name: string;
    language: string;
    meta_template_id: string | null;
  }>;
  const localByKey = new Map(
    local.map((l) => [`${l.name}::${l.language}`, l]),
  );

  // Upsert the templates that currently live on the partner's WABA.
  for (const t of metaTemplates) {
    const key = `${t.name}::${t.language}`;
    const match = localByKey.get(key);
    const reason = normalizeRejectedReason(t.rejected_reason);
    if (match) {
      await fetchFromHasura(UPDATE_LOCAL_STATUS, {
        id: match.id,
        status: t.status || "PENDING",
        meta_template_id: t.id || null,
        rejection_reason: reason,
      }).catch(() => {});
    } else {
      await fetchFromHasura(INSERT_LOCAL, {
        object: {
          partner_id: partnerId,
          name: t.name,
          language: t.language,
          category: t.category,
          components: t.components,
          status: t.status || "PENDING",
          meta_template_id: t.id || null,
          rejection_reason: reason,
        },
      }).catch(() => {});
    }
  }

  // Prune local rows that were previously synced from Meta (they carry a
  // meta_template_id) but no longer exist on the partner's CURRENT WABA — e.g.
  // templates left over from a different WhatsApp account the partner was
  // connected to before. Rows without a meta_template_id are unsubmitted local
  // drafts, so we keep those. Safe: only runs after a successful
  // listMetaTemplates against the current WABA (an empty list prunes them all).
  const currentKeys = new Set(
    metaTemplates.map((t) => `${t.name}::${t.language}`),
  );
  const staleIds = local
    .filter(
      (l) => l.meta_template_id && !currentKeys.has(`${l.name}::${l.language}`),
    )
    .map((l) => l.id);
  if (staleIds.length) {
    await fetchFromHasura(DELETE_STALE_LOCAL, { ids: staleIds }).catch((e) =>
      console.warn("Prune stale templates failed:", e?.message || e),
    );
  }
}
