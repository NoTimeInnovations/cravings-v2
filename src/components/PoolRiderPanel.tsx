"use client";

import { Truck, Phone, MapPin, X, CheckCircle2 } from "lucide-react";

/**
 * Assigned Menuthere-pool rider card — same look as the porter-bridge
 * DeliveryRiderPanel. Presentational: fed by delivery_provider_meta
 * (riderName / riderPhone / riderVehicle / trackingUrl). Shows a "finding a
 * rider" state before assignment, the rider card while on the way, and a
 * Delivered card when completed. `showCancel` adds a cancel-delivery action.
 */
export default function PoolRiderPanel({
  name,
  phone,
  vehicle,
  trackUrl,
  completed = false,
  showCancel = false,
  onCancel,
  cancelling = false,
}: {
  name?: string | null;
  phone?: string | null;
  vehicle?: string | null;
  trackUrl?: string | null;
  completed?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();
  const vehicleLabel = vehicle || "Delivery partner";

  // Delivered.
  if (completed && name) {
    return (
      <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">Delivered</h2>
            <p className="text-sm text-gray-600 mt-0.5">Delivered by the Menuthere rider</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          {phone && <p className="text-sm text-gray-700 mt-1">{phone}</p>}
        </div>
      </div>
    );
  }

  const trackCancel = (trackUrl || (showCancel && onCancel)) && (
    <div className="mt-3 flex flex-wrap gap-2">
      {trackUrl && (
        <a
          href={trackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-purple-700 ring-1 ring-purple-200 hover:bg-purple-50 rounded-full text-sm font-semibold shadow-sm transition-colors"
        >
          <MapPin className="h-4 w-4" />
          Track live
        </a>
      )}
      {showCancel && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 rounded-full text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          {cancelling ? "Cancelling…" : "Cancel delivery"}
        </button>
      )}
    </div>
  );

  // Searching — no rider yet.
  if (!name) {
    if (!trackUrl && !showCancel) return null;
    return (
      <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">Finding a rider…</h2>
            <p className="text-sm text-gray-600 mt-0.5">Menuthere Pool · searching</p>
          </div>
        </div>
        {trackCancel}
      </div>
    );
  }

  // On the way — rider assigned.
  return (
    <div className="rounded-2xl shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center">
          <Truck className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-900">On the way</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-purple-700 ring-1 ring-purple-200 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Menuthere Pool
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5">Rider assigned · on the way</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{vehicleLabel}</p>
          {phone && <p className="text-xs font-medium text-gray-700 mt-0.5">{phone}</p>}
        </div>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        )}
      </div>

      {trackCancel}
    </div>
  );
}
