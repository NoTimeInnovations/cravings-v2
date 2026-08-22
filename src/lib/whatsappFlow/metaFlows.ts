// Meta Flows API client — publishes a `questionnaire` step as a real WhatsApp
// Flow on the partner's own WABA.
//
// Why publishing happens at SAVE time and not at send time: a published Flow is
// immutable on Meta's side, so every edit means creating a new Flow. Doing that
// while a customer waits would add two Graph round-trips to the reply path and
// would race between concurrent runs. Instead the flow-save endpoints call
// `syncQuestionnaireNodes` once, stamp the resulting flow id onto the node, and
// the engine just sends it.
//
// Docs: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  buildQuestionnaireFlowJson,
  questionnaireHash,
  validateQuestionnaire,
  type QuestionnaireData,
} from "@/lib/whatsappFlow/questionnaire";
import type { FlowGraph } from "@/lib/whatsappFlow/types";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

// The WABA the partner's questionnaires are created under, plus a token with a
// role on it. Same precedence the engine uses when sending: the partner's
// primary integration first, our system-user token as the fallback for WABAs
// inside our own business.
const Q_WABA = `
  query PartnerWaba($p: uuid!) {
    whatsapp_business_integrations(
      where: { partner_id: { _eq: $p } }
      order_by: { is_primary: desc, updated_at: asc }
      limit: 1
    ) {
      waba_id
      access_token
    }
  }
`;

export interface WabaCredentials {
  wabaId: string;
  token: string;
}

export async function getPartnerWabaCredentials(
  partnerId: string,
): Promise<WabaCredentials | null> {
  try {
    const res = await fetchFromHasura(Q_WABA, { p: partnerId });
    const row = res?.whatsapp_business_integrations?.[0];
    if (!row?.waba_id) return null;
    const token = row.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) return null;
    return { wabaId: String(row.waba_id), token: String(token) };
  } catch (e) {
    console.error("getPartnerWabaCredentials failed:", e);
    return null;
  }
}

/** Meta returns per-line problems with the Flow JSON; join them into one line. */
function describeValidationErrors(errors: any[]): string {
  return errors
    .slice(0, 3)
    .map((e) => e?.message || e?.error || "Invalid Flow JSON")
    .join("; ");
}

function graphError(data: any, fallback: string): string {
  return (
    data?.error?.error_user_msg ||
    data?.error?.message ||
    (Array.isArray(data?.validation_errors) && data.validation_errors.length
      ? describeValidationErrors(data.validation_errors)
      : fallback)
  );
}

export interface PublishResult {
  flowId?: string;
  /** "PUBLISHED" when live; "DRAFT" when it exists but only admins can open it. */
  status?: "PUBLISHED" | "DRAFT";
  error?: string;
}

/**
 * Create a Flow from the compiled JSON and publish it.
 *
 * Created first, published second (rather than `publish: true` on create) so a
 * Flow that compiles but fails Meta's publish checks still exists as a draft:
 * the partner can preview it in WhatsApp Manager, and we can send it in draft
 * mode to the WABA's own admins for testing instead of losing the work.
 */
export async function createAndPublishFlow(args: {
  creds: WabaCredentials;
  name: string;
  categories: string[];
  flowJson: Record<string, unknown>;
}): Promise<PublishResult> {
  const { creds, name, categories, flowJson } = args;

  let createData: any;
  try {
    const res = await fetch(`${GRAPH}/${creds.wabaId}/flows`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        categories,
        flow_json: JSON.stringify(flowJson),
      }),
    });
    createData = await res.json().catch(() => ({}));
    if (!res.ok || !createData?.id) {
      return { error: graphError(createData, "WhatsApp rejected the questionnaire.") };
    }
  } catch (e: any) {
    return { error: e?.message || "Could not reach WhatsApp." };
  }

  const flowId = String(createData.id);
  if (Array.isArray(createData.validation_errors) && createData.validation_errors.length) {
    return {
      flowId,
      status: "DRAFT",
      error: describeValidationErrors(createData.validation_errors),
    };
  }

  try {
    const res = await fetch(`${GRAPH}/${flowId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return {
        flowId,
        status: "DRAFT",
        error: graphError(data, "WhatsApp could not publish the questionnaire."),
      };
    }
  } catch (e: any) {
    return { flowId, status: "DRAFT", error: e?.message || "Could not publish." };
  }

  return { flowId, status: "PUBLISHED" };
}

/**
 * Retire the Flow a questionnaire used before it was edited. Published Flows can
 * only be deprecated, drafts can be deleted — try both, and never let either
 * failure surface: the new Flow is already live, and a stray old one is
 * cosmetic clutter in WhatsApp Manager, not a broken questionnaire.
 */
async function retireFlow(creds: WabaCredentials, flowId: string): Promise<void> {
  const headers = { Authorization: `Bearer ${creds.token}` };
  try {
    const res = await fetch(`${GRAPH}/${flowId}/deprecate`, { method: "POST", headers });
    if (res.ok) return;
  } catch {
    /* fall through to delete */
  }
  try {
    await fetch(`${GRAPH}/${flowId}`, { method: "DELETE", headers });
  } catch {
    /* ignore — see the comment above */
  }
}

/** Flow names must be unique on a WABA and are only ever seen in Manager. */
function metaFlowName(flowName: string, nodeId: string, hash: string): string {
  const base = String(flowName || "questionnaire")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const node = nodeId.replace(/[^a-zA-Z0-9]+/g, "_").slice(-16);
  return `mt_${base || "questionnaire"}_${node}_${hash}`.slice(0, 200);
}

export interface SyncWarning {
  nodeId: string;
  message: string;
}

/**
 * Make sure every `questionnaire` node in `graph` has a live Meta Flow that
 * matches what the partner just authored, stamping `metaFlowId` / `metaFlowHash`
 * / `metaFlowStatus` onto the node data in place.
 *
 * A node whose content hash still matches its stamped flow id is left alone —
 * that's the common save (someone edited a message three steps away). Anything
 * that fails is reported as a warning rather than thrown: the flow still saves,
 * the node records why it isn't sendable, and the builder shows it. Losing an
 * author's work because Meta was briefly unreachable would be much worse than
 * saving a questionnaire that says it needs republishing.
 */
export async function syncQuestionnaireNodes(
  partnerId: string,
  graph: FlowGraph,
  /** Only used to make the Meta-side flow name recognisable in Manager. */
  flowName = "questionnaire",
): Promise<SyncWarning[]> {
  const nodes = (graph?.nodes || []).filter((n) => n.type === "questionnaire");
  if (!nodes.length) return [];

  const warnings: SyncWarning[] = [];
  let creds: WabaCredentials | null | undefined;

  for (const node of nodes) {
    const data = (node.data || {}) as unknown as QuestionnaireData;

    const problem = validateQuestionnaire(data);
    if (problem) {
      data.metaFlowError = problem;
      warnings.push({ nodeId: node.id, message: problem });
      continue;
    }

    const hash = questionnaireHash(data);
    if (data.metaFlowId && data.metaFlowHash === hash && data.metaFlowStatus === "PUBLISHED") {
      delete data.metaFlowError;
      continue; // unchanged and already live
    }

    if (creds === undefined) creds = await getPartnerWabaCredentials(partnerId);
    if (!creds) {
      const msg =
        "Connect a WhatsApp number to this store before using a questionnaire step.";
      data.metaFlowError = msg;
      warnings.push({ nodeId: node.id, message: msg });
      continue;
    }

    const previousFlowId = data.metaFlowId;
    const result = await createAndPublishFlow({
      creds,
      name: metaFlowName(flowName, node.id, hash),
      categories: [data.category || "SURVEY"],
      flowJson: buildQuestionnaireFlowJson(data),
    });

    if (!result.flowId) {
      data.metaFlowError = result.error || "Could not publish the questionnaire.";
      warnings.push({ nodeId: node.id, message: data.metaFlowError });
      continue;
    }

    data.metaFlowId = result.flowId;
    data.metaFlowHash = hash;
    data.metaFlowStatus = result.status || "DRAFT";
    if (result.error) {
      data.metaFlowError = result.error;
      warnings.push({ nodeId: node.id, message: result.error });
    } else {
      delete data.metaFlowError;
    }

    if (previousFlowId && previousFlowId !== result.flowId) {
      retireFlow(creds, previousFlowId).catch(() => {});
    }
  }

  return warnings;
}
