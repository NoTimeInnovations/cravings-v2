"use client";

import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPickerModal, type PickedLocation } from "./MapPickerModal";
import type { AddRestaurantForm } from "./types";

/**
 * Step 3 — the address line customers read, plus the pin deliveries are routed
 * from. The pin is required: without it the restaurant can't be found in
 * nearby-search and delivery distance/pricing can't be calculated.
 */
export function StepLocation({
  form,
  disabled,
  onChange,
}: {
  form: AddRestaurantForm;
  disabled: boolean;
  onChange: (patch: Partial<AddRestaurantForm>) => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const hasPin = form.lat != null && form.lng != null;

  const handleConfirm = (picked: PickedLocation) => {
    onChange({
      lat: picked.lat,
      lng: picked.lng,
      // Only overwrite text fields the pin actually resolved — a blank
      // reverse-geocode shouldn't wipe what the operator already typed.
      ...(picked.address ? { address: picked.address } : {}),
      ...(picked.district ? { district: picked.district } : {}),
      ...(picked.state ? { state: picked.state } : {}),
      ...(picked.country ? { country: picked.country } : {}),
      // Kept apart from `placeId` on purpose: this one only enriches the saved
      // row, it must never flip the create path over to the Google signup.
      ...(picked.placeId ? { pinPlaceId: picked.placeId } : {}),
    });
    setMapOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tv-address">
          Address <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="tv-address"
          rows={3}
          value={form.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Street, area, city…"
          disabled={disabled}
        />
        <p className="text-[11px] text-muted-foreground">
          Shown on the storefront and the bill. Plain text, not a Maps link.
        </p>
      </div>

      <div className="space-y-2">
        <Label>
          Map pin <span className="text-red-500">*</span>
        </Label>
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
            hasPin
              ? "border-green-300 bg-green-50 dark:border-green-900/40 dark:bg-green-900/15"
              : "border-input"
          }`}
        >
          {hasPin ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {hasPin ? "Location set" : "No pin yet"}
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {hasPin
                ? `${form.lat!.toFixed(5)}, ${form.lng!.toFixed(5)}`
                : "Deliveries and nearby search need an exact point."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => setMapOpen(true)}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {hasPin ? "Move the pin" : "Pick on the map"}
        </Button>
      </div>

      {(form.district || form.state) && (
        <p className="text-[11px] text-muted-foreground">
          Detected area: {[form.district, form.state].filter(Boolean).join(", ")}
        </p>
      )}

      <MapPickerModal
        open={mapOpen}
        initialLat={form.lat}
        initialLng={form.lng}
        onCancel={() => setMapOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
