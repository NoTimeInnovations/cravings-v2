"use client";

import { useEffect, useState } from "react";
import { Phone, MapPin, Loader2, BadgeCheck, X } from "lucide-react";
import { toast } from "sonner";
import { getDispatchProgress, cancelDispatch } from "@/app/actions/porterBridge";

interface Rider {
  status: string;
  wonProvider: string | null;
  driver: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    photoUrl?: string;
  } | null;
  trackUrl: string | null;
}

const PROVIDER: Record<string, { label: string; grad: string; avatar: string }> = {
  porter: { label: "Porter", grad: "from-amber-500 to-orange-600", avatar: "bg-amber-100 text-amber-700" },
  uber: { label: "Uber", grad: "from-zinc-700 to-zinc-900", avatar: "bg-zinc-200 text-zinc-800" },
  rapido: { label: "Rapido", grad: "from-yellow-400 to-amber-500", avatar: "bg-yellow-100 text-yellow-800" },
};
const FALLBACK = { label: "Delivery", grad: "from-blue-500 to-indigo-600", avatar: "bg-blue-100 text-blue-700" };

/**
 * Polished, provider-agnostic "delivery partner" card for bridge-dispatched
 * orders. Shows the assigned rider (name, vehicle, phone) + live track link;
 * `showCancel` adds a cancel-delivery action (admin). Renders nothing until a
 * rider is assigned. Mount only for orders with a dispatchId.
 */
export default function DeliveryRiderPanel({
  orderId,
  showCancel = false,
}: {
  orderId: string;
  showCancel?: boolean;
}) {
  const [r, setR] = useState<Rider | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const res = await getDispatchProgress(orderId);
      if (!active) return;
      if (res.ok) {
        const d = res.data as unknown as Rider;
        setR(d);
        const assigned = d.status === "assigned" && !!d.driver?.name;
        timer = setTimeout(tick, assigned ? 20000 : 6000);
      }
    };
    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (cancelled) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
        Delivery cancelled.
      </div>
    );
  }
  if (!r || !r.driver?.name) return null;

  const driver = r.driver;
  const name = driver.name ?? "";
  const p = (r.wonProvider && PROVIDER[r.wonProvider]) || FALLBACK;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const doCancel = async () => {
    if (!confirm("Cancel this delivery? The rider may already be on the way.")) return;
    setCancelling(true);
    const res = await cancelDispatch(orderId);
    setCancelling(false);
    if (res.ok || res.status === 404) {
      setCancelled(true);
      toast.success("Delivery cancelled");
    } else {
      toast.error(res.message || "Failed to cancel delivery");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      {/* Header */}
      <div className={`flex items-center justify-between bg-gradient-to-r ${p.grad} px-4 py-2.5 text-white`}>
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <BadgeCheck className="h-4 w-4" />
          Delivery partner assigned
        </span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">
          {p.label}
        </span>
      </div>

      {/* Rider */}
      <div className="flex items-center gap-3 p-4">
        {driver.photoUrl && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={driver.photoUrl}
            alt={name}
            onError={() => setImgOk(false)}
            className="h-12 w-12 shrink-0 rounded-full bg-muted object-cover"
          />
        ) : (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${p.avatar}`}>
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{name}</div>
          {driver.vehicleNumber && (
            <div className="mt-1 inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium tracking-wide">
              {driver.vehicleNumber}
              {driver.vehicleModel ? <span className="ml-1 font-sans text-muted-foreground">· {driver.vehicleModel}</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(driver.phone || r.trackUrl) && (
        <div className="flex gap-2 border-t px-3 py-2.5">
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          {r.trackUrl && (
            <a
              href={r.trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <MapPin className="h-4 w-4" /> Track live
            </a>
          )}
        </div>
      )}

      {/* Cancel (admin) */}
      {showCancel && (
        <div className="border-t px-3 py-2.5">
          <button
            type="button"
            onClick={doCancel}
            disabled={cancelling}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            {cancelling ? "Cancelling…" : "Cancel delivery"}
          </button>
        </div>
      )}
    </div>
  );
}
