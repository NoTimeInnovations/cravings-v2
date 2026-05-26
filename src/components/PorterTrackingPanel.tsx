"use client";

import { useCallback, useEffect, useState } from "react";
import { Bike, ExternalLink, Phone, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import {
  type PorterMeta,
  extractTrackingUrl,
  isPorterLive,
  porterStatusDisplay,
} from "@/lib/porterTrackingUrl";
import { cancelPorter, getPorterTracking } from "@/app/actions/porterBridge";

interface PorterTrackingPanelProps {
  orderId: string;
  /** The order row's delivery_provider value — we only render if it's "porter". */
  provider: string | null | undefined;
  /** The order row's delivery_provider_order_id (CRN). */
  crn: string | null | undefined;
  /** The order row's delivery_provider_state. */
  state: string | null | undefined;
  /** The order row's delivery_provider_meta jsonb. */
  meta: PorterMeta | null | undefined;
  /** When true, show the "Cancel booking" button (admin-only). */
  showCancel?: boolean;
}

const TONE: Record<
  "pending" | "active" | "done" | "error",
  { dot: string; chip: string }
> = {
  pending: {
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900",
  },
  active: {
    dot: "bg-blue-500 animate-pulse",
    chip: "bg-blue-100 text-blue-900",
  },
  done: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-900",
  },
  error: {
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-900",
  },
};

export default function PorterTrackingPanel({
  orderId,
  provider,
  crn,
  state,
  meta,
  showCancel = false,
}: PorterTrackingPanelProps) {
  // Only render for porter-routed orders.
  if (provider !== "porter") return null;

  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Auto-refresh while the booking is live (every 20 s). Hasura subscription
  // on the parent already streams updates; this refresh just nudges the
  // bridge to write a fresh state back into the order row.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getPorterTracking(orderId);
    } catch (e) {
      console.warn("[porter-bridge] tracking refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!isPorterLive(state)) return;
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [state, refresh]);

  async function onCancel() {
    if (!confirm(`Cancel Porter booking ${crn}? Driver may already be en route.`))
      return;
    setCancelling(true);
    try {
      const res = await cancelPorter(orderId, "Cancelled from admin");
      if (res.ok) {
        toast.success(`Porter booking ${crn} cancelled`);
      } else {
        toast.error(`Cancel failed: ${res.message}`);
      }
      await refresh();
    } catch (e) {
      toast.error(
        `Cancel failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    } finally {
      setCancelling(false);
    }
  }

  const display = porterStatusDisplay(state);
  const trackingUrl = extractTrackingUrl(meta?.shareText);
  const driver = meta?.driver;
  const tone = TONE[display.tone];
  const errorMsg = display.tone === "error" ? meta?.error : null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950">
            <Bike className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Porter delivery
            </div>
            {crn && (
              <div className="font-mono text-[11px] text-zinc-500">{crn}</div>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {display.label}
        </span>
      </div>

      {errorMsg && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {errorMsg}
        </p>
      )}

      {driver?.name && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              Rider
            </div>
            <div className="mt-0.5 text-sm font-medium">{driver.name}</div>
          </div>
          {driver.vehicleNumber && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Vehicle
              </div>
              <div className="mt-0.5 font-mono text-sm">
                {driver.vehicleNumber}
              </div>
            </div>
          )}
          {driver.phone && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Phone
              </div>
              <a
                href={`tel:${driver.phone}`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
              >
                <Phone className="h-3 w-3" />
                {driver.phone}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            Track delivery
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        {showCancel && state !== "cancelled" && state !== "ended" && state !== "failed" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
          >
            <X className="h-3.5 w-3.5" />
            {cancelling ? "Cancelling…" : "Cancel booking"}
          </button>
        )}
      </div>

      {meta?.fareAmount != null && (
        <div className="mt-3 text-[11px] text-zinc-500">
          Quoted ₹{meta.fareAmount}
          {meta.paymentMode ? ` · ${meta.paymentMode}` : ""}
        </div>
      )}
    </div>
  );
}
