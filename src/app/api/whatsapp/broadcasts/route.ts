import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { normalizePhone } from "@/lib/whatsapp-broadcast";

// Phones that sent STOP/UNSUBSCRIBE to this partner — excluded from broadcasts.
const GET_OPTOUTS = `
  query GetOptouts($partner_id: uuid!) {
    whatsapp_broadcast_optouts(where: { partner_id: { _eq: $partner_id } }) {
      phone
    }
  }
`;

// GET /api/whatsapp/broadcasts?partnerId=<uuid>
// Lists the partner's broadcasts (newest first) with progress counts.
const LIST = `
  query ListBroadcasts($partner_id: uuid!) {
    whatsapp_broadcasts(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
    ) {
      id
      template_name
      language
      category
      status
      scheduled_at
      daily_limit
      total_recipients
      sent_count
      delivered_count
      read_count
      failed_count
      total_cost
      cost_currency
      last_error
      started_at
      completed_at
      created_at
    }
  }
`;

const INSERT_BROADCAST = `
  mutation InsertBroadcast($object: whatsapp_broadcasts_insert_input!) {
    insert_whatsapp_broadcasts_one(object: $object) { id }
  }
`;

const INSERT_RECIPIENTS = `
  mutation InsertRecipients($objects: [whatsapp_broadcast_recipients_insert_input!]!) {
    insert_whatsapp_broadcast_recipients(objects: $objects) { affected_rows }
  }
`;

const GET_TEMPLATE = `
  query GetTemplate($id: uuid!, $partner_id: uuid!) {
    whatsapp_message_templates(
      where: { id: { _eq: $id }, partner_id: { _eq: $partner_id } }
      limit: 1
    ) {
      id
      name
      language
      category
      status
      components
    }
  }
`;

const DELETE_BROADCAST = `
  mutation DeleteBroadcast($id: uuid!) {
    delete_whatsapp_broadcasts_by_pk(id: $id) { id }
  }
`;

export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }
  try {
    const data = await fetchFromHasura(LIST, { partner_id: partnerId });
    return NextResponse.json({ broadcasts: data?.whatsapp_broadcasts || [] });
  } catch (e: any) {
    console.error("List broadcasts failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load broadcasts" },
      { status: 500 },
    );
  }
}

// Count distinct {{n}} placeholders in the template body.
function bodyVariableCount(components: any[]): number {
  const body = (components || []).find((c) => c?.type === "BODY");
  const text: string = body?.text || "";
  const indices = new Set<number>();
  (text.match(/\{\{(\d+)\}\}/g) || []).forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) indices.add(n);
  });
  return indices.size;
}

// POST /api/whatsapp/broadcasts
// Body: { partnerId, templateId, scheduledAt|null, variableMap, headerParams?, recipients:[{phone,name?}] }
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, templateId, scheduledAt, variableMap, headerParams, headerMediaUrl, recipients } =
    body || {};

  if (!partnerId || !templateId || !Array.isArray(recipients)) {
    return NextResponse.json(
      { error: "Missing partnerId, templateId, or recipients" },
      { status: 400 },
    );
  }

  // Validate the template belongs to the partner and is approved.
  let template: any;
  try {
    const data = await fetchFromHasura(GET_TEMPLATE, {
      id: templateId,
      partner_id: partnerId,
    });
    template = data?.whatsapp_message_templates?.[0];
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load template" },
      { status: 500 },
    );
  }
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if ((template.status || "").toUpperCase() !== "APPROVED") {
    return NextResponse.json(
      { error: "Only APPROVED templates can be broadcast" },
      { status: 400 },
    );
  }

  // Media-header templates need the image/video/document to send. Derive the
  // media type from the template's own HEADER format so the client only sends a URL.
  const headerComp = (template.components || []).find(
    (c: any) => String(c?.type).toUpperCase() === "HEADER",
  );
  const headerFmt = String(headerComp?.format || "").toUpperCase();
  const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFmt);
  const headerMediaType = isMediaHeader ? headerFmt.toLowerCase() : null;
  if (isMediaHeader && (!headerMediaUrl || typeof headerMediaUrl !== "string")) {
    return NextResponse.json(
      { error: "This template has a media header — attach the image/video/document to broadcast." },
      { status: 400 },
    );
  }

  // Validate variable map length matches the template's body variable count.
  const varCount = bodyVariableCount(template.components);
  const cleanVarMap = Array.isArray(variableMap) ? variableMap.slice(0, varCount) : [];
  while (cleanVarMap.length < varCount) cleanVarMap.push({ source: "fixed", value: "" });
  for (const v of cleanVarMap) {
    if (!["phone", "name", "fixed"].includes(v?.source)) {
      return NextResponse.json(
        { error: "Invalid variable mapping" },
        { status: 400 },
      );
    }
  }

  // Normalize + dedupe recipients (phone required, name optional).
  const seen = new Set<string>();
  const cleanRecipients: { phone: string; name: string | null }[] = [];
  for (const r of recipients) {
    const rawPhone = String(r?.phone ?? "").trim();
    if (!rawPhone) continue;
    const digits = rawPhone.replace(/[\s\-\+\(\)]/g, "");
    if (digits.length < 10) continue; // too short to be a real number
    if (seen.has(digits)) continue;
    seen.add(digits);
    const name = r?.name != null ? String(r.name).trim() : "";
    cleanRecipients.push({ phone: rawPhone, name: name || null });
  }

  // Drop anyone who opted out of this partner's marketing (sent STOP).
  try {
    const optData = await fetchFromHasura(GET_OPTOUTS, { partner_id: partnerId });
    const optedOut = new Set<string>(
      (optData?.whatsapp_broadcast_optouts || []).map((o: any) =>
        normalizePhone(String(o.phone || "")),
      ),
    );
    if (optedOut.size) {
      for (let i = cleanRecipients.length - 1; i >= 0; i--) {
        if (optedOut.has(normalizePhone(cleanRecipients[i].phone))) {
          cleanRecipients.splice(i, 1);
        }
      }
    }
  } catch (e) {
    console.error("Opt-out filter failed (continuing without it):", e);
  }

  if (cleanRecipients.length === 0) {
    return NextResponse.json(
      { error: "No valid recipients (after removing opted-out numbers; each needs a phone with at least 10 digits)" },
      { status: 400 },
    );
  }

  // Insert the broadcast. scheduled_at = chosen time, or now for send-asap.
  let broadcastId: string;
  try {
    const inserted = await fetchFromHasura(INSERT_BROADCAST, {
      object: {
        partner_id: partnerId,
        template_id: template.id,
        template_name: template.name,
        language: template.language,
        category: template.category,
        variable_map: cleanVarMap,
        header_params:
          Array.isArray(headerParams) && headerParams.length ? headerParams : null,
        header_media_url: isMediaHeader ? headerMediaUrl : null,
        header_media_type: headerMediaType,
        status: "scheduled",
        scheduled_at: scheduledAt || new Date().toISOString(),
        total_recipients: cleanRecipients.length,
      },
    });
    broadcastId = inserted?.insert_whatsapp_broadcasts_one?.id;
    if (!broadcastId) throw new Error("Insert returned no id");
  } catch (e: any) {
    console.error("Insert broadcast failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to create broadcast" },
      { status: 500 },
    );
  }

  // Bulk insert recipients in chunks to keep the payload reasonable.
  try {
    const CHUNK = 1000;
    for (let i = 0; i < cleanRecipients.length; i += CHUNK) {
      const objects = cleanRecipients.slice(i, i + CHUNK).map((r) => ({
        broadcast_id: broadcastId,
        phone: r.phone,
        name: r.name,
        status: "pending",
      }));
      await fetchFromHasura(INSERT_RECIPIENTS, { objects });
    }
  } catch (e: any) {
    // Roll back the broadcast so we don't leave an empty campaign behind.
    await fetchFromHasura(DELETE_BROADCAST, { id: broadcastId }).catch(() => {});
    console.error("Insert recipients failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to add recipients" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: broadcastId,
    total_recipients: cleanRecipients.length,
  });
}
