import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { extractTriggers, validateGraph, FlowValidationError } from "@/lib/whatsappFlow/validate";
import type { FlowGraph } from "@/lib/whatsappFlow/types";

const LIST = `
  query ListFlows($partner_id: uuid!) {
    whatsapp_flows(where: { partner_id: { _eq: $partner_id } }, order_by: { created_at: desc }) {
      id
      name
      description
      enabled
      triggers
      escape_keyword
      run_ttl_hours
      created_at
      updated_at
    }
  }
`;

const INSERT = `
  mutation InsertFlow($object: whatsapp_flows_insert_input!) {
    insert_whatsapp_flows_one(object: $object) {
      id
      name
      enabled
    }
  }
`;

// GET /api/whatsapp/flows?partnerId=<uuid> — list a partner's flows (no graph,
// just the summary used by the Flows list).
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }
  try {
    const data = await fetchFromHasura(LIST, { partner_id: partnerId });
    return NextResponse.json({ flows: data?.whatsapp_flows || [] });
  } catch (e: any) {
    console.error("List flows failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to load flows" }, { status: 500 });
  }
}

// POST /api/whatsapp/flows — create a flow.
// Body: { partnerId, name, description?, enabled?, graph, escapeKeyword?, runTtlHours? }
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, name, description, enabled, graph, escapeKeyword, runTtlHours, oncePerUser } = body || {};
  if (!partnerId || !name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing partnerId or name" }, { status: 400 });
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

  try {
    const inserted = await fetchFromHasura(INSERT, {
      object: {
        partner_id: partnerId,
        name: name.trim().slice(0, 255),
        description: description ? String(description).slice(0, 512) : null,
        enabled: enabled === undefined ? true : !!enabled,
        graph: g,
        triggers: extractTriggers(g),
        escape_keyword: escapeKeyword ? String(escapeKeyword).slice(0, 64) : null,
        run_ttl_hours: clampTtl(runTtlHours),
        once_per_user: !!oncePerUser,
        updated_at: new Date().toISOString(),
      },
    });
    return NextResponse.json({ id: inserted?.insert_whatsapp_flows_one?.id }, { status: 201 });
  } catch (e: any) {
    console.error("Create flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to create flow" }, { status: 500 });
  }
}

function clampTtl(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 24;
  return Math.max(1, Math.min(720, Math.round(n)));
}
