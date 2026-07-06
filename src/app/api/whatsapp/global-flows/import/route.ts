import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Import a global flow into a partner's own flows. Two modes:
//   • "replace" — overwrite an existing partner flow (targetFlowId) in place,
//     keeping its id + enabled state (so replacing a live flow stays live).
//   • "add"     — create a new partner flow (disabled), auto-suffixing the name
//     on collision so it never silently clobbers an existing flow.

const GET_GLOBAL = `
  query GetGlobalFlow($id: uuid!) {
    whatsapp_global_flows_by_pk(id: $id) {
      name graph triggers escape_keyword run_ttl_hours once_per_user cooldown_hours
    }
  }
`;
const PARTNER_NAMES = `
  query PartnerFlowNames($p: uuid!) {
    whatsapp_flows(where: { partner_id: { _eq: $p } }) { id name }
  }
`;
const UPDATE = `
  mutation ReplacePartnerFlow($id: uuid!, $p: uuid!, $changes: whatsapp_flows_set_input!) {
    update_whatsapp_flows(where: { id: { _eq: $id }, partner_id: { _eq: $p } }, _set: $changes) {
      affected_rows
      returning { id }
    }
  }
`;
const INSERT = `
  mutation AddPartnerFlow($object: whatsapp_flows_insert_input!) {
    insert_whatsapp_flows_one(object: $object) { id }
  }
`;

// POST /api/whatsapp/global-flows/import
// Body: { partnerId, globalFlowId, mode: "replace" | "add", targetFlowId? }
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, globalFlowId, mode, targetFlowId } = body || {};
  if (!partnerId || !globalFlowId) {
    return NextResponse.json({ error: "Missing partnerId or globalFlowId" }, { status: 400 });
  }
  if (mode !== "replace" && mode !== "add") {
    return NextResponse.json({ error: "mode must be 'replace' or 'add'" }, { status: 400 });
  }

  try {
    const gRes = await fetchFromHasura(GET_GLOBAL, { id: globalFlowId });
    const gf = gRes?.whatsapp_global_flows_by_pk;
    if (!gf) return NextResponse.json({ error: "Global flow not found" }, { status: 404 });

    // The flow content copied into the partner, verbatim from the library.
    const content = {
      graph: gf.graph || { nodes: [], edges: [] },
      triggers: gf.triggers || [],
      escape_keyword: gf.escape_keyword ?? null,
      run_ttl_hours: gf.run_ttl_hours ?? 24,
      once_per_user: !!gf.once_per_user,
      cooldown_hours: gf.cooldown_hours ?? 0,
    };

    if (mode === "replace") {
      if (!targetFlowId) {
        return NextResponse.json({ error: "targetFlowId required to replace" }, { status: 400 });
      }
      const res = await fetchFromHasura(UPDATE, {
        id: targetFlowId,
        p: partnerId,
        changes: { ...content, name: gf.name, updated_at: new Date().toISOString() },
      });
      const updatedId = res?.update_whatsapp_flows?.returning?.[0]?.id;
      if (!updatedId) {
        return NextResponse.json({ error: "Flow to replace not found" }, { status: 404 });
      }
      return NextResponse.json({ id: updatedId, mode: "replace" });
    }

    // mode === "add": pick a non-colliding name (case-insensitive) so the new
    // flow is always distinguishable from any existing one.
    const namesRes = await fetchFromHasura(PARTNER_NAMES, { p: partnerId });
    const taken = new Set<string>(
      (namesRes?.whatsapp_flows || []).map((f: { name: string }) => String(f.name).toLowerCase()),
    );
    let name = String(gf.name || "Imported flow").slice(0, 240);
    if (taken.has(name.toLowerCase())) {
      let n = 1;
      let candidate = `${name} (copy)`;
      while (taken.has(candidate.toLowerCase())) {
        n += 1;
        candidate = `${name} (copy ${n})`;
      }
      name = candidate;
    }
    const ins = await fetchFromHasura(INSERT, {
      object: {
        partner_id: partnerId,
        name,
        enabled: false, // imported disabled — the partner reviews, then turns on
        ...content,
        updated_at: new Date().toISOString(),
      },
    });
    return NextResponse.json({ id: ins?.insert_whatsapp_flows_one?.id, mode: "add", name }, { status: 201 });
  } catch (e: any) {
    console.error("Import global flow failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to import global flow" }, { status: 500 });
  }
}
