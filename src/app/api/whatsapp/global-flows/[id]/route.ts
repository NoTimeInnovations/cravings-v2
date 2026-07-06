import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { extractTriggers, validateGraph, FlowValidationError } from "@/lib/whatsappFlow/validate";
import type { FlowGraph } from "@/lib/whatsappFlow/types";

const GET_ONE = `
  query GetGlobalFlow($id: uuid!) {
    whatsapp_global_flows_by_pk(id: $id) {
      id
      name
      description
      graph
      triggers
      escape_keyword
      run_ttl_hours
      once_per_user
      cooldown_hours
      created_at
      updated_at
    }
  }
`;
const UPDATE = `
  mutation UpdateGlobalFlow($id: uuid!, $changes: whatsapp_global_flows_set_input!) {
    update_whatsapp_global_flows_by_pk(pk_columns: { id: $id }, _set: $changes) { id }
  }
`;
const DELETE_ONE = `
  mutation DeleteGlobalFlow($id: uuid!) {
    delete_whatsapp_global_flows_by_pk(id: $id) { id }
  }
`;

// GET /api/whatsapp/global-flows/<id> — full global flow incl. graph (for the builder).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const data = await fetchFromHasura(GET_ONE, { id });
    const flow = data?.whatsapp_global_flows_by_pk;
    if (!flow) return NextResponse.json({ error: "Global flow not found" }, { status: 404 });
    return NextResponse.json({ flow });
  } catch (e: any) {
    console.error("Get global flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to load global flow" }, { status: 500 });
  }
}

// PUT /api/whatsapp/global-flows/<id> — edit a global flow.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
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
  if (body.escapeKeyword !== undefined)
    changes.escape_keyword = body.escapeKeyword ? String(body.escapeKeyword).slice(0, 64) : null;
  if (body.runTtlHours !== undefined) changes.run_ttl_hours = clampTtl(body.runTtlHours);
  if (body.oncePerUser !== undefined) changes.once_per_user = !!body.oncePerUser;
  if (body.cooldownHours !== undefined) changes.cooldown_hours = clampCooldown(body.cooldownHours);

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
    const res = await fetchFromHasura(UPDATE, { id, changes });
    if (!res?.update_whatsapp_global_flows_by_pk?.id) {
      return NextResponse.json({ error: "Global flow not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Case-insensitive unique name → renaming onto another entry conflicts.
    if (/unique|duplicate/i.test(String(e?.message || e))) {
      return NextResponse.json({ error: "A global flow with that name already exists" }, { status: 409 });
    }
    console.error("Update global flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to update global flow" }, { status: 500 });
  }
}

// DELETE /api/whatsapp/global-flows/<id>
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const res = await fetchFromHasura(DELETE_ONE, { id });
    if (!res?.delete_whatsapp_global_flows_by_pk?.id) {
      return NextResponse.json({ error: "Global flow not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Delete global flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to delete global flow" }, { status: 500 });
  }
}

function clampTtl(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 24;
  return Math.max(1, Math.min(720, Math.round(n)));
}

function clampCooldown(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(8760, Math.round(n));
}
