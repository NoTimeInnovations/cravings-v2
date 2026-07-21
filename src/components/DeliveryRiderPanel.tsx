"use client";

import { useEffect, useState } from "react";
import { Truck, Phone, MapPin, Loader2, X, Copy, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getDispatchProgress, cancelDispatch } from "@/app/actions/porterBridge";

interface Driver {
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  photoUrl?: string;
}
interface HistItem {
  bookingId: string;
  provider: string;
  status: string;
  driver: Driver | null;
  createdAt: number;
}
interface Rider {
  status: string;
  /** The won booking's LIVE status — flips to cancelled/ended/failed when the
   *  delivery is cancelled from the bridge dashboard. */
  bookingStatus?: string | null;
  wonProvider: string | null;
  driver: Driver | null;
  trackUrl: string | null;
  /** Every booking for this order across ALL its dispatches (oldest first) —
   *  so the rider who actually delivered is recoverable even after a
   *  cancel + re-dispatch (the delivering booking lives on a later dispatch). */
  history?: HistItem[];
}

const PROVIDER_LABEL: Record<string, string> = {
  porter: "Porter",
  uber: "Uber",
  rapido: "Rapido",
};

const isDead = (s?: string | null) => s === "cancelled" || s === "failed";

/**
 * The rider who actually took this order to the customer — for the "Delivered"
 * card once the order is completed. Prefer a booking that reached "ended";
 * otherwise the most recent non-cancelled booking that had a driver (the ride
 * happened even if the bridge never observed the final "ended" tick). Spans
 * dispatches via `history`, so a rider booked on a re-dispatch after an earlier
 * cancel is still found. Returns null when no rider ever took it (self-delivered
 * / all attempts cancelled) — we don't fabricate a deliverer.
 */
function pickDeliveredRider(r: Rider): { driver: Driver; provider: string | null } | null {
  const hist = [...(r.history ?? [])].reverse(); // newest first
  const ended = hist.find((h) => h.status === "ended" && h.driver?.name);
  const active = hist.find((h) => !isDead(h.status) && h.driver?.name);
  const fromHist = ended ?? active;
  if (fromHist?.driver?.name) return { driver: fromHist.driver, provider: fromHist.provider };
  if (r.driver?.name && !isDead(r.bookingStatus)) return { driver: r.driver, provider: r.wonProvider };
  return null;
}

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
  completed = false,
}: {
  orderId: string;
  showCancel?: boolean;
  /** When the order is marked completed, render a static "Delivered" card and
   *  stop polling — the rider is no longer en route. */
  completed?: boolean;
}) {
  const [r, setR] = useState<Rider | null>(null);
  const [imgOk, setImgOk] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [copied, setCopied] = useState(false);

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
        // Once the order is completed we only need the rider's details once —
        // no need to keep polling for live location.
        if (!term && !completed) {
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
  }, [orderId, completed]);

  const copyPhone = async (phone?: string) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      toast.success("Phone number copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy number");
    }
  };

  // Order completed → static "Delivered" card showing WHO took the ride (name,
  // vehicle, phone). Recovered via pickDeliveredRider so it survives a
  // cancel + re-dispatch. If nobody ever took it (self-delivered / all
  // attempts cancelled) render nothing — never the stale "on the way" /
  // "cancelled" UI for a finished order.
  const delivered = completed && r ? pickDeliveredRider(r) : null;
  if (completed) {
    if (!delivered) return null;
    const d = delivered.driver;
    const provider = delivered.provider ? (PROVIDER_LABEL[delivered.provider] ?? delivered.provider) : "Delivery";
    return (
      <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-gray-900">Delivered</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-emerald-700 ring-1 ring-emerald-200 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {provider}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">Order delivered by the partner</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
          <div>
            <p className="font-semibold text-gray-900 truncate">{d.name}</p>
            {d.vehicleNumber && (
              <p className="text-xs text-gray-500 truncate">
                {d.vehicleNumber}
                {d.vehicleModel ? ` · ${d.vehicleModel}` : ""}
              </p>
            )}
          </div>
          {d.phone && (
            <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
              <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-gray-800">{d.phone}</span>
              <button
                type="button"
                onClick={() => copyPhone(d.phone)}
                aria-label="Copy phone number"
                className="inline-flex items-center justify-center h-7 w-7 rounded-full hover:bg-gray-100 transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          {driver.phone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-medium text-gray-700">{driver.phone}</span>
              <button
                type="button"
                onClick={() => copyPhone(driver.phone)}
                aria-label="Copy phone number"
                className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-purple-100 transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-500" />
                )}
              </button>
            </div>
          )}
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
