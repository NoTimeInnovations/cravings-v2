import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { extractTriggers, validateGraph, FlowValidationError } from "@/lib/whatsappFlow/validate";
import type { FlowGraph } from "@/lib/whatsappFlow/types";

const GET_ONE = `
  query GetFlow($id: uuid!, $partner_id: uuid!) {
    whatsapp_flows(where: { id: { _eq: $id }, partner_id: { _eq: $partner_id } }) {
      id
      partner_id
      name
      description
      enabled
      graph
      triggers
      escape_keyword
      run_ttl_hours
      created_at
      updated_at
    }
  }
`;

const UPDATE = `
  mutation UpdateFlow($id: uuid!, $partner_id: uuid!, $changes: whatsapp_flows_set_input!) {
    update_whatsapp_flows(where: { id: { _eq: $id }, partner_id: { _eq: $partner_id } }, _set: $changes) {
      affected_rows
    }
  }
`;

const DELETE_ONE = `
  mutation DeleteFlow($id: uuid!, $partner_id: uuid!) {
    delete_whatsapp_flows(where: { id: { _eq: $id }, partner_id: { _eq: $partner_id } }) {
      affected_rows
    }
  }
`;

function requirePartner(req: NextRequest): string | null {
  return req.nextUrl.searchParams.get("partnerId");
}

// GET /api/whatsapp/flows/<id>?partnerId= — full flow incl. graph (for the builder).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partnerId = requirePartner(req);
  if (!id || !partnerId) {
    return NextResponse.json({ error: "Missing id or partnerId" }, { status: 400 });
  }
  try {
    const data = await fetchFromHasura(GET_ONE, { id, partner_id: partnerId });
    const flow = data?.whatsapp_flows?.[0];
    if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    return NextResponse.json({ flow });
  } catch (e: any) {
    console.error("Get flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to load flow" }, { status: 500 });
  }
}

// PUT /api/whatsapp/flows/<id>?partnerId= — full update from the builder.
// Body: { name?, description?, enabled?, graph?, escapeKeyword?, runTtlHours? }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partnerId = requirePartner(req);
  if (!id || !partnerId) {
    return NextResponse.json({ error: "Missing id or partnerId" }, { status: 400 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") changes.name = body.name.trim().slice(0, 255);
  if (body.description !== undefined)
    changes.description = body.description ? String(body.description).slice(0, 512) : null;
  if (body.enabled !== undefined) changes.enabled = !!body.enabled;
  if (body.escapeKeyword !== undefined)
    changes.escape_keyword = body.escapeKeyword ? String(body.escapeKeyword).slice(0, 64) : null;
  if (body.runTtlHours !== undefined) changes.run_ttl_hours = clampTtl(body.runTtlHours);

  if (body.graph !== undefined) {
    const g: FlowGraph = body.graph && typeof body.graph === "object" ? body.graph : { nodes: [], edges: [] };
    try {
      validateGraph(g);
    } catch (e: any) {
      if (e instanceof FlowValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }
    changes.graph = g;
    changes.triggers = extractTriggers(g);
  }

  try {
    const res = await fetchFromHasura(UPDATE, { id, partner_id: partnerId, changes });
    if (!res?.update_whatsapp_flows?.affected_rows) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Update flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to update flow" }, { status: 500 });
  }
}

// PATCH /api/whatsapp/flows/<id>?partnerId= — quick toggle. Body: { enabled }.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partnerId = requirePartner(req);
  if (!id || !partnerId) {
    return NextResponse.json({ error: "Missing id or partnerId" }, { status: 400 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.enabled === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  try {
    const res = await fetchFromHasura(UPDATE, {
      id,
      partner_id: partnerId,
      changes: { enabled: !!body.enabled, updated_at: new Date().toISOString() },
    });
    if (!res?.update_whatsapp_flows?.affected_rows) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Toggle flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to update flow" }, { status: 500 });
  }
}

// DELETE /api/whatsapp/flows/<id>?partnerId=
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partnerId = requirePartner(req);
  if (!id || !partnerId) {
    return NextResponse.json({ error: "Missing id or partnerId" }, { status: 400 });
  }
  try {
    const res = await fetchFromHasura(DELETE_ONE, { id, partner_id: partnerId });
    if (!res?.delete_whatsapp_flows?.affected_rows) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Delete flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to delete flow" }, { status: 500 });
  }
}

function clampTtl(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 24;
  return Math.max(1, Math.min(720, Math.round(n)));
}
