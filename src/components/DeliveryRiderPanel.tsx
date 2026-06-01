"use client";

import { useEffect, useState } from "react";
import { Truck, Phone, MapPin, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getDispatchProgress, cancelDispatch } from "@/app/actions/porterBridge";

interface Rider {
  status: string;
  /** The won booking's LIVE status — flips to cancelled/ended/failed when the
   *  delivery is cancelled from the bridge dashboard. */
  bookingStatus?: string | null;
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

const PROVIDER_LABEL: Record<string, string> = {
  porter: "Porter",
  uber: "Uber",
  rapido: "Rapido",
};

/**
 * Assigned delivery-partner card for bridge-dispatched orders — styled to match
 * the partner-rider ("On the way") card. Shows the rider name, vehicle, phone +
 * live track link once any provider (porter/uber/rapido) assigns a rider.
 * `showCancel` adds a cancel-delivery action (admin). Renders nothing until a
 * rider is assigned; mount only for orders with a dispatchId.
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
        const term = d.bookingStatus === "cancelled" || d.bookingStatus === "failed" || d.bookingStatus === "ended";
        if (!term) {
          const assigned = d.status === "assigned" && !!d.driver?.name;
          timer = setTimeout(tick, assigned ? 20000 : 6000);
        }
      }
    };
    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  // Terminal either locally (cancel button) or from the bridge dashboard
  // (won booking flipped to cancelled/failed).
  const terminated =
    cancelled || r?.bookingStatus === "cancelled" || r?.bookingStatus === "failed";
  if (terminated) {
    return (
      <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
        {r?.bookingStatus === "failed" ? "Delivery failed." : "Delivery cancelled."}
      </div>
    );
  }
  if (!r || !r.driver?.name) return null;

  const driver = r.driver;
  const name = driver.name ?? "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const providerLabel = r.wonProvider ? (PROVIDER_LABEL[r.wonProvider] ?? r.wonProvider) : "Delivery";
  const vehicle = driver.vehicleNumber
    ? driver.vehicleNumber + (driver.vehicleModel ? ` · ${driver.vehicleModel}` : "")
    : "Delivery Partner";

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
    <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm">
          <Truck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-900">On the way</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-purple-700 ring-1 ring-purple-200 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              {providerLabel}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">Rider assigned · on the way</p>
        </div>
      </div>

      {/* Rider card */}
      <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
        {driver.photoUrl && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={driver.photoUrl}
            alt={name}
            onError={() => setImgOk(false)}
            className="flex-shrink-0 w-11 h-11 rounded-full object-cover bg-purple-100"
          />
        ) : (
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{vehicle}</p>
        </div>
        {driver.phone && (
          <a
            href={`tel:${driver.phone}`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-full text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        )}
      </div>

      {/* Track + cancel */}
      {(r.trackUrl || showCancel) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.trackUrl && (
            <a
              href={r.trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-purple-700 ring-1 ring-purple-200 hover:bg-purple-50 rounded-full text-sm font-semibold shadow-sm transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Track live
            </a>
          )}
          {showCancel && (
            <button
              type="button"
              onClick={doCancel}
              disabled={cancelling}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 rounded-full text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {cancelling ? "Cancelling…" : "Cancel delivery"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
