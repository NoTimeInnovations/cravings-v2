"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { buildDefaultFlows } from "@/lib/whatsappFlow/defaultFlows";

const EXISTING = `
  query ExistingFlowNames($p: uuid!) {
    whatsapp_flows(where: { partner_id: { _eq: $p } }) { name }
  }
`;
const INSERT = `
  mutation InsertDefaultFlows($objects: [whatsapp_flows_insert_input!]!) {
    insert_whatsapp_flows(objects: $objects) { affected_rows }
  }
`;

// Create the built-in WhatsApp flow set for a partner. Idempotent: only inserts
// the default flows the partner doesn't already have (matched by name), so it's
// safe to call every time WhatsApp ordering is enabled, and never clobbers a
// partner's edits or duplicates flows.
export async function provisionDefaultFlows(
  partnerId: string,
): Promise<{ created: number }> {
  if (!partnerId) return { created: 0 };
  try {
    const data = await fetchFromHasura(EXISTING, { p: partnerId });
    const existing = new Set(
      (data?.whatsapp_flows || []).map((f: { name: string }) => f.name),
    );
    const toCreate = buildDefaultFlows().filter((f) => !existing.has(f.name));
    if (!toCreate.length) return { created: 0 };

    await fetchFromHasura(INSERT, {
      objects: toCreate.map((f) => ({
        partner_id: partnerId,
        name: f.name,
        enabled: true,
        graph: f.graph,
        triggers: f.triggers,
        run_ttl_hours: 24,
        updated_at: new Date().toISOString(),
      })),
    });
    return { created: toCreate.length };
  } catch (e) {
    console.error("provisionDefaultFlows failed:", e);
    return { created: 0 };
  }
}
