"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getDispatchProgress, cancelDispatch } from "@/app/actions/porterBridge";

type ProviderState = "won" | "checking" | "tried" | "pending";
interface HistItem {
  bookingId: string;
  provider: string;
  status: string;
  crn: string | null;
  driver: { name?: string; phone?: string; vehicleNumber?: string; vehicleModel?: string } | null;
  fareAmount: number | null;
  createdAt: number;
}
interface Progress {
  status: string;
  vehicleMode: string | null;
  currentProvider: string | null;
  wonProvider: string | null;
  providers: Array<{ provider: string; state: ProviderState }>;
  driverName: string | null;
  trackUrl: string | null;
  history?: HistItem[];
  log: Array<{ t: number; text: string; tone: string }>;
}

const STATE_UI: Record<ProviderState, { label: string; cls: string }> = {
  won: { label: "Live", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  checking: { label: "Checking…", cls: "border-amber-300 bg-amber-50 text-amber-700 animate-pulse" },
  tried: { label: "Cancelled", cls: "border-rose-300 bg-rose-50 text-rose-700" },
  pending: { label: "Waiting", cls: "border-border bg-muted text-muted-foreground" },
};

const STATUS_LABEL: Record<string, string> = {
  running: "In progress",
  assigned: "Rider assigned",
  searching: "Still searching (last provider)",
  exhausted: "No rider found",
  stopped: "Stopped",
  error: "Error",
};

/**
 * Live view of the multi-provider delivery-bridge dispatch for an order:
 * which provider is being checked right now and each provider's outcome
 * (cancelled / live / waiting). Polls every 5s while the dispatch is running.
 * Renders nothing if the order wasn't dispatched through the bridge.
 */
function histStatus(status: string): { label: string; cls: string } {
  switch (status) {
    case "ended": return { label: "Delivered", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" };
    case "cancelled": return { label: "Cancelled", cls: "border-rose-300 bg-rose-50 text-rose-700" };
    case "failed": return { label: "Failed", cls: "border-rose-300 bg-rose-50 text-rose-700" };
    case "started": return { label: "Picked up", cls: "border-blue-300 bg-blue-50 text-blue-700" };
    case "not_started": return { label: "Assigned", cls: "border-amber-300 bg-amber-50 text-amber-700" };
    case "unallocated": return { label: "Searching", cls: "border-amber-300 bg-amber-50 text-amber-700" };
    default: return { label: status, cls: "border-border bg-muted text-muted-foreground" };
  }
}

// Previously-booked riders for this order (across dispatches) + their outcome.
// Surfaces cancelled/escalated riders so a cancel doesn't just silently vanish.
function RiderHistoryBlock({ history }: { history: HistItem[] }) {
  if (!history.length) return null;
  return (
    <div className="mt-3 border-t pt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Rider history
      </p>
      <div className="space-y-1.5">
        {history.map((h) => {
          const st = histStatus(h.status);
          return (
            <div key={h.bookingId} className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium capitalize">{h.provider}</span>
                {h.driver?.name ? <span className="text-muted-foreground"> · {h.driver.name}</span> : null}
                {h.driver?.vehicleNumber ? <span className="text-muted-foreground"> · {h.driver.vehicleNumber}</span> : null}
                {h.crn ? <span className="text-muted-foreground"> · {h.crn}</span> : null}
              </span>
              <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DispatchProgressPanel({ orderId }: { orderId: string }) {
  const [p, setP] = useState<Progress | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  // Stop the poll loop immediately once we've cancelled, without waiting for the
  // bridge status to flip on the next tick.
  const cancelledRef = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const r = await getDispatchProgress(orderId);
      if (!active) return;
      if (r.ok) {
        const data = r.data as unknown as Progress;
        setP(data);
        if (data.status === "running" && !cancelledRef.current) timer = setTimeout(tick, 5000);
      }
      // 404 (no dispatch) or error → stop polling; panel just won't render.
    };
    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  // Cancel the in-flight delivery-bridge dispatch (only offered while it's still
  // checking providers and hasn't already been cancelled).
  const handleCancel = async () => {
    if (cancelling || cancelled) return;
    if (!window.confirm("Cancel this delivery dispatch? The provider search will stop.")) return;
    setCancelling(true);
    setCancelError(null);
    const r = await cancelDispatch(orderId);
    setCancelling(false);
    if (r.ok) {
      cancelledRef.current = true;
      setCancelled(true);
      setP(prev => (prev ? { ...prev, status: "stopped", currentProvider: null } : prev));
    } else {
      setCancelError(r.message || "Failed to cancel dispatch");
    }
  };

  if (!p) return null;
  const showHistory =
    (p.history ?? []).length > 1 ||
    (p.history ?? []).some((h) => h.status === "cancelled" || h.status === "failed");
  // Once a rider is assigned, the live DeliveryRiderPanel takes over the escalation
  // card — but if an earlier rider was cancelled/escalated, still surface the rider
  // history so the operator can see who was booked before.
  if (p.status === "assigned") {
    return showHistory ? (
      <div className="border rounded-lg bg-card p-4">
        <h3 className="mb-2 font-semibold">Delivery Bridge dispatch</h3>
        <RiderHistoryBlock history={p.history ?? []} />
      </div>
    ) : null;
  }

  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Delivery Bridge dispatch</h3>
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
          {STATUS_LABEL[p.status] ?? p.status}
          {p.vehicleMode ? ` · ${p.vehicleMode}` : ""}
        </span>
      </div>

      {p.currentProvider && (
        <p className="mb-2 text-sm">
          Currently checking <strong className="capitalize">{p.currentProvider}</strong>…
        </p>
      )}

      <div className="space-y-1.5">
        {p.providers.map((pr, i) => (
          <div key={pr.provider} className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm">
            <span className="w-4 text-center tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="flex-1 capitalize">{pr.provider}</span>
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATE_UI[pr.state].cls}`}>
              {STATE_UI[pr.state].label}
            </span>
          </div>
        ))}
      </div>

      {showHistory && <RiderHistoryBlock history={p.history ?? []} />}

      {/* Dispatch exhausted every provider (or errored) with no rider assigned —
          tell the partner clearly they must self-deliver. Restricted to these
          terminal no-rider states (NOT "searching"/"running", which are still in
          progress, and NOT "stopped", which is a deliberate cancel shown below).
          Mirrors the exhausted->"failed" reconcile in getDispatchProgress. */}
      {(p.status === "exhausted" || p.status === "error") && !p.wonProvider && !cancelled && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border-2 border-rose-400 bg-rose-50 p-3.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-800">
              No third-party rider available right now — please deliver this order yourself.
            </p>
            <p className="mt-1 text-xs text-rose-700">
              None of the delivery partners could pick up this order. Use “Book rider now” to try again, or arrange your own delivery.
            </p>
          </div>
        </div>
      )}

      {p.status === "running" && !cancelled && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-3 w-full rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelling ? "Cancelling…" : "Cancel dispatch"}
        </button>
      )}

      {cancelled && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
          Dispatch cancelled.
        </p>
      )}

      {cancelError && <p className="mt-2 text-xs text-rose-600">{cancelError}</p>}

      {p.driverName && (
        <p className="mt-2 text-sm text-emerald-700">Driver assigned: <strong>{p.driverName}</strong></p>
      )}

      {p.log.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">Activity log</summary>
          <ul className="mt-1 space-y-0.5 text-xs">
            {p.log.map((l, idx) => (
              <li
                key={idx}
                className={
                  l.tone === "err"
                    ? "text-rose-600"
                    : l.tone === "success"
                      ? "text-emerald-600"
                      : l.tone === "warn"
                        ? "text-amber-600"
                        : "text-muted-foreground"
                }
              >
                {l.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
