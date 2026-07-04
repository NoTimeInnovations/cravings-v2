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
      waba_id
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
    $waba_id: String
  ) {
    update_whatsapp_message_templates_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        meta_template_id: $meta_template_id
        rejection_reason: $rejection_reason
        waba_id: $waba_id
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

// Existing rows with the same name + language for this partner. Used to block
// genuine duplicates and to clean up leftover failed attempts before retrying.
// Scoped to a single WABA — a template name is unique per WABA at Meta, so a
// partner with two WABAs can legitimately have the same-named template on each.
const FIND_BY_NAME = `
  query FindTemplateByName($partner_id: uuid!, $name: String!, $language: String!, $waba_id: String) {
    whatsapp_message_templates(
      where: {
        partner_id: { _eq: $partner_id }
        name: { _eq: $name }
        language: { _eq: $language }
        waba_id: { _eq: $waba_id }
      }
    ) {
      id
      status
      meta_template_id
    }
  }
`;

// Template review can take a moment at Meta; give the function headroom so a
// slow Graph response can't turn into a serverless 503.
export const maxDuration = 30;

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
          await reconcileWithMeta(partnerId, integration.waba_id, metaTemplates);
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
//
// Atomic, Meta-first: we submit to Meta and only persist a local row if Meta
// ACCEPTS it. If Meta rejects (or errors), nothing is saved — so a failed
// submission never leaves a stuck "REJECTED" row in the list, and the partner's
// typed content stays in the form to fix and retry. The error message returned
// is Meta's own reason so the partner knows exactly what to fix.
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
  if (!Array.isArray(components) || components.length === 0) {
    return NextResponse.json(
      { error: "A template needs at least one component (e.g. a body)." },
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

  // Look up any existing rows with this name+language. Block genuine duplicates;
  // collect leftover failed attempts (no meta_template_id) to clear on success.
  let orphanIds: string[] = [];
  try {
    const existingRes = await fetchFromHasura(FIND_BY_NAME, {
      partner_id: partnerId,
      name,
      language,
      waba_id: integration.waba_id,
    });
    const existing = (existingRes?.whatsapp_message_templates || []) as Array<{
      id: string;
      status: string;
      meta_template_id: string | null;
    }>;
    const blocking = existing.find(
      (r) =>
        r.meta_template_id ||
        ["PENDING", "APPROVED"].includes(String(r.status).toUpperCase()),
    );
    if (blocking) {
      return NextResponse.json(
        {
          error:
            "A template with this name and language already exists. Pick a different name, or delete the existing one first.",
        },
        { status: 409 },
      );
    }
    // Only leftovers from earlier failed attempts remain — clear them on success.
    orphanIds = existing.map((r) => r.id);
  } catch (e: any) {
    // Non-fatal: Meta + the local unique index still guard against duplicates.
    console.warn("Template duplicate pre-check failed:", e?.message || e);
  }

  // Submit to Meta FIRST. Nothing is saved locally unless this succeeds.
  let metaRes: { id: string; status: string; category: string };
  try {
    const payload: MetaTemplatePayload = {
      name,
      language,
      category,
      components: components as MetaTemplateComponent[],
    };
    metaRes = await createMetaTemplate(
      integration.waba_id,
      partnerWabaToken(integration),
      payload,
    );
  } catch (e: any) {
    // Meta refused it — return its reason and save NOTHING (no orphan row).
    return NextResponse.json(
      { error: e?.message || "WhatsApp rejected the template." },
      { status: 400 },
    );
  }

  // Meta accepted → remove any prior failed attempts for this name, then mirror.
  if (orphanIds.length) {
    await fetchFromHasura(DELETE_STALE_LOCAL, { ids: orphanIds }).catch(() => {});
  }
  try {
    const inserted = await fetchFromHasura(INSERT_LOCAL, {
      object: {
        partner_id: partnerId,
        name,
        language,
        category,
        components,
        status: metaRes?.status || "PENDING",
        meta_template_id: metaRes?.id || null,
        waba_id: integration.waba_id,
      },
    });
    return NextResponse.json({
      id: inserted?.insert_whatsapp_message_templates_one?.id,
      meta_template_id: metaRes?.id,
      status: metaRes?.status || "PENDING",
    });
  } catch (e: any) {
    // Meta already has it; only the local mirror failed (e.g. a rare unique
    // race). It'll appear on the next sync — report success, not failure.
    console.error("Local mirror insert failed after Meta success:", e);
    return NextResponse.json({
      meta_template_id: metaRes?.id,
      status: metaRes?.status || "PENDING",
      warning: "Submitted to WhatsApp — it'll appear in the list shortly.",
    });
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

// Reconcile local templates with whatever Meta currently has for ONE WABA.
// Local rows matched by (name + language) get their status/meta_template_id/
// rejection updated. Templates that exist on Meta but not locally are inserted.
//
// Multi-number: a partner can have several WABAs, each with its OWN template
// library. The sync (and especially the destructive prune) is scoped to the
// wabaId being synced — rows belonging to the partner's OTHER WABAs are left
// untouched, so syncing one number never deletes another number's templates.
// Legacy rows with a NULL waba_id predate multi-number and are treated as
// belonging to the synced WABA (and get stamped with it on update).
async function reconcileWithMeta(
  partnerId: string,
  wabaId: string,
  metaTemplates: Awaited<ReturnType<typeof listMetaTemplates>>,
) {
  const data = await fetchFromHasura(LIST_LOCAL, { partner_id: partnerId });
  const allLocal = (data?.whatsapp_message_templates || []) as Array<{
    id: string;
    name: string;
    language: string;
    status: string;
    meta_template_id: string | null;
    waba_id: string | null;
  }>;
  // Only the rows that belong to the WABA we just listed (or legacy null rows).
  const local = allLocal.filter((l) => !l.waba_id || l.waba_id === wabaId);
  const localByKey = new Map(
    local.map((l) => [`${l.name}::${l.language}`, l]),
  );

  // Upsert the templates that currently live on this WABA.
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
        waba_id: wabaId,
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
          waba_id: wabaId,
        },
      }).catch(() => {});
    }
  }

  // Prune rows for THIS WABA that were previously synced from Meta (they carry a
  // meta_template_id) but no longer exist on it — e.g. a template the partner
  // deleted at Meta. Rows without a meta_template_id are unsubmitted local
  // drafts, so we keep those. Scoped to `local` (this WABA only), so another
  // WABA's templates are never touched.
  const currentKeys = new Set(
    metaTemplates.map((t) => `${t.name}::${t.language}`),
  );
  // Only delete rows that POSITIVELY belong to the synced WABA. Legacy
  // null-waba_id rows are eligible for match/stamp above (they get adopted into
  // this WABA only when a Meta template matches by name+language), but must
  // NEVER be pruned by an unrelated WABA's sync — otherwise syncing WABA-B could
  // delete a legacy row that really belongs to WABA-A.
  const staleIds = local
    .filter(
      (l) =>
        l.waba_id === wabaId &&
        l.meta_template_id &&
        !currentKeys.has(`${l.name}::${l.language}`),
    )
    .map((l) => l.id);

  // Also prune ORPHAN rows: REJECTED/DRAFT rows with no meta_template_id that
  // aren't on Meta either. These can only come from a failed submission (the old
  // create flow left a REJECTED draft behind); the current flow never creates
  // them. Scoped to this WABA so a legacy null row is never dropped here.
  const orphanIds = local
    .filter(
      (l) =>
        l.waba_id === wabaId &&
        !l.meta_template_id &&
        ["REJECTED", "DRAFT"].includes(String(l.status).toUpperCase()) &&
        !currentKeys.has(`${l.name}::${l.language}`),
    )
    .map((l) => l.id);

  const toDelete = [...new Set([...staleIds, ...orphanIds])];
  if (toDelete.length) {
    await fetchFromHasura(DELETE_STALE_LOCAL, { ids: toDelete }).catch((e) =>
      console.warn("Prune stale templates failed:", e?.message || e),
    );
  }
}
