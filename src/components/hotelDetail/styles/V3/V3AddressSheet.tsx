"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapPin, ChevronDown, ArrowLeft } from "lucide-react";
import type { SavedAddress } from "../../placeOrder/AddressManagementModal";
import AddressPickerBody from "../../placeOrder/AddressPickerBody";

interface V3AddressSheetProps {
  currentAddress: string;
  onSelect: (address: string, coords: { lat: number; lng: number } | null) => void;
  onClose: () => void;
  accent?: string;
  savedAddresses?: SavedAddress[];
  onDeleteSaved?: (id: string) => void;
  /**
   * If provided, search-suggestion picks and "Use my location" hand the
   * chosen point to this callback instead of committing via onSelect — so
   * the consumer can open a map picker for fine-tuning and saving.
   */
  onPickForMap?: (address: string, coords: { lat: number; lng: number } | null) => void;
  /**
   * If provided, the "Add new Address" row calls this instead of the map
   * picker — so the consumer can jump straight to the address-details form
   * using the already-selected location (no location re-ask).
   */
  onAddNew?: () => void;
  /** Partner/outlet coordinates, used to show the distance to each address. */
  partnerCoords?: { lat: number; lng: number } | null;
  /** Partner id — so the Maps requests this sheet makes are attributed to the
   *  partner (and, once the order is placed, to the order) in usage analytics. */
  partnerId?: string | null;
  brandHeader?: {
    brandName: string;
    outletLabel: string | null;
    onChange: () => void;
  } | null;
}

export default function V3AddressSheet({ currentAddress, onSelect, onClose, accent = "#1f2937", savedAddresses, onDeleteSaved, onPickForMap, onAddNew, partnerCoords, partnerId, brandHeader }: V3AddressSheetProps) {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const ANIM_MS = 450;

  // Trigger slide-up on mount (after first paint so the transition runs)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock background scroll while the sheet is mounted
  useEffect(() => {
    const original = document.body.style.overflow;
    const originalTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = original;
      document.body.style.touchAction = originalTouch;
    };
  }, []);

  const animateAndSelect = useCallback(
    (addr: string, coords: { lat: number; lng: number } | null) => {
      setClosing(true);
      setTimeout(() => onSelect(addr, coords), ANIM_MS);
    },
    [onSelect],
  );

  const animateAndPickForMap = useCallback(
    (addr: string, coords: { lat: number; lng: number } | null) => {
      if (!onPickForMap) {
        animateAndSelect(addr, coords);
        return;
      }
      setClosing(true);
      setTimeout(() => onPickForMap(addr, coords), ANIM_MS);
    },
    [onPickForMap, animateAndSelect],
  );

  const animateAndAddNew = useCallback(() => {
    if (!onAddNew) return;
    setClosing(true);
    setTimeout(() => onAddNew(), ANIM_MS);
  }, [onAddNew]);

  const animateClose = () => {
    setClosing(true);
    setTimeout(onClose, ANIM_MS);
  };

  return (
    <div className="fixed inset-0 z-[500]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Backdrop */}
      <div
        onClick={animateClose}
        className="absolute inset-0 bg-black/40"
        style={{
          opacity: !mounted || closing ? 0 : 1,
          transition: `opacity ${ANIM_MS}ms ease-out`,
        }}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-2xl h-[92vh] overflow-hidden flex flex-col"
        style={{
          transform: !mounted || closing ? "translateY(100%)" : "translateY(0)",
          transition: `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {/* Header */}
        <div className="bg-white shrink-0">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button onClick={animateClose} aria-label="Back" className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Select Your Location</h2>
          </div>

          {/* Outlet row (multi-outlet brands) */}
          {brandHeader && (
            <button
              type="button"
              onClick={() => { brandHeader.onChange(); animateClose(); }}
              className="w-[calc(100%-2rem)] mx-4 mb-3 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-left transition active:opacity-70"
            >
              <MapPin className="w-4 h-4 shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Outlet</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {brandHeader.brandName}
                  {brandHeader.outletLabel ? ` — ${brandHeader.outletLabel}` : ""}
                </p>
              </div>
              <span className="text-xs font-semibold inline-flex items-center gap-0.5 shrink-0" style={{ color: accent }}>
                Change
                <ChevronDown className="w-3 h-3" />
              </span>
            </button>
          )}
        </div>

        {/* Address picker body (search + action cards + saved + recents) */}
        <AddressPickerBody
          currentAddress={currentAddress}
          onSelect={animateAndSelect}
          onPickForMap={onPickForMap ? animateAndPickForMap : undefined}
          onAddNew={onAddNew ? animateAndAddNew : undefined}
          savedAddresses={savedAddresses}
          onDeleteSaved={onDeleteSaved}
          partnerCoords={partnerCoords}
          partnerId={partnerId}
          accent={accent}
        />
      </div>
    </div>
  );
}
