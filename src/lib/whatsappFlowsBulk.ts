// Helpers for turning WhatsApp flows on/off. There's no bulk endpoint, so we
// PATCH each flow individually (same shape the Flows screen uses for a single
// toggle: PATCH /api/whatsapp/flows/{id}?partnerId=... body { enabled }).

export async function patchFlowEnabled(
  partnerId: string,
  flowId: string,
  enabled: boolean,
): Promise<void> {
  const res = await fetch(`/api/whatsapp/flows/${flowId}?partnerId=${partnerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to update flow");
}

/**
 * Set every flow for a partner to `enabled`. Fetches the current list, PATCHes
 * only the ones that differ, and reports how many flows exist / were changed.
 * Throws if any PATCH fails (so callers can revert / re-sync).
 */
export async function setAllFlowsEnabled(
  partnerId: string,
  enabled: boolean,
): Promise<{ total: number; changed: number }> {
  const res = await fetch(`/api/whatsapp/flows?partnerId=${partnerId}`);
  if (!res.ok) throw new Error("Failed to load flows");
  const data = await res.json();
  const flows: any[] = Array.isArray(data?.flows) ? data.flows : [];
  const targets = flows.filter((f) => !!f?.enabled !== enabled);
  const results = await Promise.allSettled(
    targets.map((f) => patchFlowEnabled(partnerId, f.id, enabled)),
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) throw new Error(`${failed} flow(s) failed to update`);
  return { total: flows.length, changed: targets.length };
}
