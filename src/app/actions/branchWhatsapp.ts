"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

/**
 * Superadmin "copy WhatsApp from the main branch to all outlets" feature.
 *
 * A brand (branches row) can set `whatsapp_source`:
 *   - "direct": each outlet manages its own WhatsApp (default).
 *   - "main":   all outlets use the main/parent branch's WhatsApp — the parent's
 *               connection + flows are COPIED onto every outlet.
 *
 * phone_number_id is intentionally NOT unique in prod, so multiple outlets can
 * share the parent's number (outbound order messages work per-outlet; inbound
 * replies route to one). This mirrors the existing shared-number brand groups.
 */

const READ_MAIN_WA = `
query MainWhatsApp($pid: uuid!) {
  whatsapp_business_integrations(where: { partner_id: { _eq: $pid } }) {
    waba_id
    phone_number_id
    access_token
    display_phone
    meta_user_id
    is_primary
    flow_enabled
  }
  whatsapp_flows(where: { partner_id: { _eq: $pid } }) {
    name
    description
    enabled
    graph
    triggers
    escape_keyword
    run_ttl_hours
    once_per_user
    cooldown_hours
  }
  partners_by_pk(id: $pid) {
    whatsapp_numbers
    whatsapp_integration_mode
  }
}`;

const GET_OUTLET_IDS = `
query BranchOutlets($pid: uuid!) {
  branches(where: { parent_partner_id: { _eq: $pid } }, limit: 1) {
    id
    outlets { id }
  }
}`;

// Delete an outlet's existing WhatsApp, insert copies of the parent's, and mark
// the outlet as using its own ("own") integration. Runs as one Hasura
// transaction (top-level fields execute in order).
const COPY_TO_OUTLET = `
mutation CopyWhatsAppToOutlet(
  $oid: uuid!
  $integrations: [whatsapp_business_integrations_insert_input!]!
  $flows: [whatsapp_flows_insert_input!]!
  $nums: jsonb
) {
  del_int: delete_whatsapp_business_integrations(where: { partner_id: { _eq: $oid } }) { affected_rows }
  del_flow: delete_whatsapp_flows(where: { partner_id: { _eq: $oid } }) { affected_rows }
  ins_int: insert_whatsapp_business_integrations(objects: $integrations) { affected_rows }
  ins_flow: insert_whatsapp_flows(objects: $flows) { affected_rows }
  upd: update_partners_by_pk(pk_columns: { id: $oid }, _set: { whatsapp_integration_mode: "own", whatsapp_numbers: $nums }) { id }
}`;

const REMOVE_FROM_OUTLET = `
mutation RemoveWhatsAppFromOutlet($oid: uuid!) {
  del_int: delete_whatsapp_business_integrations(where: { partner_id: { _eq: $oid } }) { affected_rows }
  del_flow: delete_whatsapp_flows(where: { partner_id: { _eq: $oid } }) { affected_rows }
  upd: update_partners_by_pk(pk_columns: { id: $oid }, _set: { whatsapp_integration_mode: "menuthere", whatsapp_numbers: null }) { id }
}`;

type CopyResult =
  | { ok: false; reason: "no-branch" | "no-main-wa" | "error"; message: string }
  | { ok: true; outlets: number; integrations: number; flows: number };

async function outletIdsExcludingParent(parentPartnerId: string): Promise<string[] | null> {
  const res = await fetchFromHasura(GET_OUTLET_IDS, { pid: parentPartnerId });
  const branch = res?.branches?.[0];
  if (!branch) return null;
  return ((branch.outlets || []) as { id: string }[])
    .map((o) => o.id)
    .filter((id) => id !== parentPartnerId);
}

/** Copy the parent/main branch's WhatsApp integration + flows onto every outlet. */
export async function copyMainWhatsappToOutlets(
  parentPartnerId: string,
): Promise<CopyResult> {
  try {
    const outletIds = await outletIdsExcludingParent(parentPartnerId);
    if (outletIds === null) {
      return { ok: false, reason: "no-branch", message: "This partner is not a brand parent." };
    }

    const main = await fetchFromHasura(READ_MAIN_WA, { pid: parentPartnerId });
    const integrations = (main?.whatsapp_business_integrations || []) as any[];
    const flows = (main?.whatsapp_flows || []) as any[];
    const nums = main?.partners_by_pk?.whatsapp_numbers ?? null;

    if (integrations.length === 0) {
      return {
        ok: false,
        reason: "no-main-wa",
        message: "The main branch has no WhatsApp connected. Connect it first, then copy.",
      };
    }

    let count = 0;
    for (const oid of outletIds) {
      const intObjects = integrations.map((w) => ({
        partner_id: oid,
        waba_id: w.waba_id,
        phone_number_id: w.phone_number_id,
        access_token: w.access_token,
        display_phone: w.display_phone,
        meta_user_id: w.meta_user_id,
        is_primary: w.is_primary,
        flow_enabled: w.flow_enabled,
      }));
      const flowObjects = flows.map((f) => ({
        partner_id: oid,
        name: f.name,
        description: f.description,
        enabled: f.enabled,
        graph: f.graph,
        triggers: f.triggers,
        escape_keyword: f.escape_keyword,
        run_ttl_hours: f.run_ttl_hours,
        once_per_user: f.once_per_user,
        cooldown_hours: f.cooldown_hours,
      }));
      await fetchFromHasura(COPY_TO_OUTLET, {
        oid,
        integrations: intObjects,
        flows: flowObjects,
        nums,
      });
      count += 1;
    }

    return { ok: true, outlets: count, integrations: integrations.length, flows: flows.length };
  } catch (e: any) {
    console.error("copyMainWhatsappToOutlets failed", e);
    return { ok: false, reason: "error", message: e?.message || "Copy failed" };
  }
}

/** Remove the copied WhatsApp integration + flows from every outlet (revert to Direct). */
export async function removeOutletWhatsappCopies(
  parentPartnerId: string,
): Promise<{ ok: boolean; outlets: number; message?: string }> {
  try {
    const outletIds = await outletIdsExcludingParent(parentPartnerId);
    if (outletIds === null) return { ok: false, outlets: 0, message: "Not a brand parent." };
    let count = 0;
    for (const oid of outletIds) {
      await fetchFromHasura(REMOVE_FROM_OUTLET, { oid });
      count += 1;
    }
    return { ok: true, outlets: count };
  } catch (e: any) {
    console.error("removeOutletWhatsappCopies failed", e);
    return { ok: false, outlets: 0, message: e?.message || "Remove failed" };
  }
}
