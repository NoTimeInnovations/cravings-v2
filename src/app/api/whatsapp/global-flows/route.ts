import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { extractTriggers, validateGraph, FlowValidationError } from "@/lib/whatsappFlow/validate";
import type { FlowGraph } from "@/lib/whatsappFlow/types";

// Global (cross-partner) flow library. No partner scoping — every partner sees
// the same shared list and can save into / import from it.

const LIST = `
  query ListGlobalFlows {
    whatsapp_global_flows(order_by: { updated_at: desc }) {
      id
      name
      description
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

// Save-to-global is an upsert by (case-insensitive) name: the library never
// holds two entries with the same name, so re-saving an edited flow replaces it.
const FIND_BY_NAME = `
  query FindGlobalByName($name: String!) {
    whatsapp_global_flows(where: { name: { _ilike: $name } }, limit: 1) { id }
  }
`;
const INSERT = `
  mutation InsertGlobalFlow($object: whatsapp_global_flows_insert_input!) {
    insert_whatsapp_global_flows_one(object: $object) { id name }
  }
`;
const UPDATE = `
  mutation UpdateGlobalFlow($id: uuid!, $changes: whatsapp_global_flows_set_input!) {
    update_whatsapp_global_flows_by_pk(pk_columns: { id: $id }, _set: $changes) { id name }
  }
`;

// GET /api/whatsapp/global-flows — the full library (summaries, no graph).
export async function GET() {
  try {
    const data = await fetchFromHasura(LIST, {});
    return NextResponse.json({ flows: data?.whatsapp_global_flows || [] });
  } catch (e: any) {
    console.error("List global flows failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to load global flows" }, { status: 500 });
  }
}

// POST /api/whatsapp/global-flows — save a flow into the library (upsert by name).
// Body: { name, description?, graph, escapeKeyword?, runTtlHours?, oncePerUser?, cooldownHours? }
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description, graph, escapeKeyword, runTtlHours, oncePerUser, cooldownHours } = body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A global flow needs a name" }, { status: 400 });
  }

  const g: FlowGraph = graph && typeof graph === "object" ? graph : { nodes: [], edges: [] };
  try {
    validateGraph(g);
  } catch (e: any) {
    if (e instanceof FlowValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const cleanName = name.trim().slice(0, 255);
  const fields = {
    name: cleanName,
    description: description ? String(description).slice(0, 512) : null,
    graph: g,
    triggers: extractTriggers(g),
    escape_keyword: escapeKeyword ? String(escapeKeyword).slice(0, 64) : null,
    run_ttl_hours: clampTtl(runTtlHours),
    once_per_user: !!oncePerUser,
    cooldown_hours: clampCooldown(cooldownHours),
    updated_at: new Date().toISOString(),
  };

  try {
    const existing = await fetchFromHasura(FIND_BY_NAME, { name: cleanName });
    const hit = existing?.whatsapp_global_flows?.[0];
    if (hit?.id) {
      const upd = await fetchFromHasura(UPDATE, { id: hit.id, changes: fields });
      return NextResponse.json({ id: upd?.update_whatsapp_global_flows_by_pk?.id, replaced: true });
    }
    const ins = await fetchFromHasura(INSERT, { object: fields });
    return NextResponse.json({ id: ins?.insert_whatsapp_global_flows_one?.id, replaced: false }, { status: 201 });
  } catch (e: any) {
    console.error("Save global flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to save global flow" }, { status: 500 });
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
