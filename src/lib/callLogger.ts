/** Browser client for the Android Call Logger admin API (via the same-origin proxy). */
const BASE = '/api/call-logger';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
}

export interface PartnerRow { accountEmail: string; partnerId: string | null; lastCallAt: string }
export interface PartnerConfig {
  flow: { name?: string; enabled?: boolean; graph?: FlowGraph };
  storeName: string | null;
  totalCalls: number;
  whatsappReady: boolean;
}
export interface CallRow {
  id: string; number_raw: string; number_e164: string | null; call_type: string;
  direction: string; duration_seconds: number; started_at: string; cached_name: string | null;
}
export interface ScheduleRow {
  id: string; name: string | null; template_name: string; language: string;
  scheduled_at: string; status: string; targets_built: boolean; created_at: string;
}
export interface TargetRow {
  to_e164: string; contact_name: string | null; status: string;
  wa_message_id: string | null; error: string | null; created_at: string;
}
export interface SendRow {
  to_e164: string; template_name: string; language: string; source: string;
  status: string; wa_message_id: string | null; error: string | null; created_at: string;
}
export interface FlowNode {
  id: string; type: string; position?: { x: number; y: number }; data?: Record<string, unknown>;
}
export interface FlowEdge { from: string; to: string | null; branch?: string }
export interface FlowGraph { nodes: FlowNode[]; edges: FlowEdge[] }

export const CallLoggerApi = {
  listPartners: () => req<{ items: PartnerRow[] }>(`/partners`),
  partnerConfig: (p: string) => req<PartnerConfig>(`/partner?partner=${encodeURIComponent(p)}`),
  calls: (p: string, from: string, to: string) =>
    req<{ items: CallRow[] }>(`/calls?partner=${encodeURIComponent(p)}&from=${from}&to=${to}`),
  getFlow: (p: string) =>
    req<{ name?: string; enabled?: boolean; graph?: FlowGraph }>(`/flow?partner=${encodeURIComponent(p)}`),
  saveFlow: (p: string, body: { name: string; enabled: boolean; graph: FlowGraph }) =>
    req<{ ok: true }>(`/flow?partner=${encodeURIComponent(p)}`, { method: 'PUT', body: JSON.stringify(body) }),
  schedules: (p: string) => req<{ items: ScheduleRow[] }>(`/schedule?partner=${encodeURIComponent(p)}`),
  createSchedule: (p: string, body: unknown) =>
    req<{ id: string }>(`/schedule?partner=${encodeURIComponent(p)}`, { method: 'POST', body: JSON.stringify(body) }),
  targets: (id: string) => req<{ items: TargetRow[] }>(`/schedule/targets?id=${encodeURIComponent(id)}`),
  messages: (p: string, opts?: { status?: string; source?: string }) => {
    const qs = new URLSearchParams({ partner: p });
    if (opts?.status) qs.set("status", opts.status);
    if (opts?.source) qs.set("source", opts.source);
    return req<{ items: SendRow[] }>(`/messages?${qs.toString()}`);
  },
  /** Manually run the partner's configured flow on one number (a synthetic call). */
  runFlow: (p: string, number: string, name?: string) =>
    req<{ ok: boolean; runId?: string; contact?: string }>(
      `/run-flow?partner=${encodeURIComponent(p)}`,
      { method: "POST", body: JSON.stringify({ number, name }) },
    ),
};
