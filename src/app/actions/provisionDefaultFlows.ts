"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { buildDefaultFlows, buildLoyaltyFlows, type DefaultFlowDef } from "@/lib/whatsappFlow/defaultFlows";

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

// Insert any of `defs` the partner doesn't already have (matched by name).
// Idempotent and shared by every provisioning entry point below, so re-running
// never clobbers a partner's edits or duplicates flows.
async function provisionFlowSet(
  partnerId: string,
  defs: DefaultFlowDef[],
  enabled: boolean,
): Promise<{ created: number }> {
  if (!partnerId) return { created: 0 };
  try {
    const data = await fetchFromHasura(EXISTING, { p: partnerId });
    const existing = new Set(
      (data?.whatsapp_flows || []).map((f: { name: string }) => f.name),
    );
    const toCreate = defs.filter((f) => !existing.has(f.name));
    if (!toCreate.length) return { created: 0 };

    await fetchFromHasura(INSERT, {
      objects: toCreate.map((f) => ({
        partner_id: partnerId,
        name: f.name,
        enabled,
        graph: f.graph,
        triggers: f.triggers,
        run_ttl_hours: 24,
        updated_at: new Date().toISOString(),
      })),
    });
    return { created: toCreate.length };
  } catch (e) {
    console.error("provisionFlowSet failed:", e);
    return { created: 0 };
  }
}

// Create the built-in WhatsApp flow set for a partner (welcome + order-status).
// Idempotent — safe to call every time WhatsApp ordering is enabled. Provisioned
// DISABLED by default: every partner with the WhatsApp-ordering feature gets the
// flows ready to go, but they stay off until the partner turns them on.
export async function provisionDefaultFlows(
  partnerId: string,
): Promise<{ created: number }> {
  return provisionFlowSet(partnerId, buildDefaultFlows(), false);
}

// Create the built-in loyalty flow set for a partner (points earned). Called
// whenever the loyalty feature is enabled — kept separate so a partner without
// loyalty never gets a loyalty flow.
export async function provisionLoyaltyFlows(
  partnerId: string,
): Promise<{ created: number }> {
  return provisionFlowSet(partnerId, buildLoyaltyFlows(), true);
}
