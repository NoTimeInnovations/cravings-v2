"use client";

import { useEffect, useRef, useState } from "react";
import { getDispatchProgress, cancelDispatch } from "@/app/actions/porterBridge";

type ProviderState = "won" | "checking" | "tried" | "pending";
interface Progress {
  status: string;
  vehicleMode: string | null;
  currentProvider: string | null;
  wonProvider: string | null;
  providers: Array<{ provider: string; state: ProviderState }>;
  driverName: string | null;
  trackUrl: string | null;
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
  // Once a rider is assigned, the DeliveryRiderPanel takes over — hide the
  // escalation progress card so they don't both show.
  if (p.status === "assigned") return null;

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
