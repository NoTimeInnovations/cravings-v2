"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bike, ShoppingBag, UtensilsCrossed, MapPin } from "lucide-react";
import AddressPickerBody from "../hotelDetail/placeOrder/AddressPickerBody";
import AddressPickerV2 from "../hotelDetail/placeOrder/AddressPickerV2";
import type { SavedAddress } from "../hotelDetail/placeOrder/AddressManagementModal";
import { upsertLocalAddress } from "@/lib/localAddresses";
import { useLocationStore } from "@/store/geolocationStore";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { updateUserAddressesMutation } from "@/api/auth";
import { readableTextColor } from "@/lib/brandColor";
import { toast } from "sonner";

export type OrderTypeKey = "delivery" | "takeaway" | "dine_in";

interface OrderTypeLocationSheetProps {
  storeName: string;
  /** Store/outlet address, shown for Takeaway / Dine-in. */
  outletAddress?: string;
  accent?: string;
  availableTypes: { delivery: boolean; takeaway: boolean; dine_in: boolean };
  initialType?: OrderTypeKey;
  currentAddress?: string;
  savedAddresses?: SavedAddress[];
  onDeleteSaved?: (id: string) => void;
  partnerCoords?: { lat: number; lng: number } | null;
  partnerId: string;
  hotelData?: any;
  /** Fired when the user switches tab (so the caller can set store + cookie live). */
  onOrderTypeChange?: (type: OrderTypeKey) => void;
  /** Delivery address chosen → commit + dismiss. */
  onDeliveryAddress: (address: string, coords: { lat: number; lng: number } | null) => void;
  /** Takeaway / Dine-in confirmed → commit + dismiss. */
  onConfirm: (type: OrderTypeKey) => void;
  /** Dismiss without choosing (backdrop / skip). */
  onClose?: () => void;
}

const ANIM_MS = 420;

const TYPE_META: { key: OrderTypeKey; label: string; icon: any; sub: string }[] = [
  { key: "delivery", label: "Delivery", icon: Bike, sub: "Delivered to your doorstep" },
  { key: "takeaway", label: "Takeaway", icon: ShoppingBag, sub: "Pick up from the outlet" },
  { key: "dine_in", label: "Dine-in", icon: UtensilsCrossed, sub: "Book a table" },
];

export default function OrderTypeLocationSheet({
  storeName,
  outletAddress,
  accent = "#16a34a",
  availableTypes,
  initialType,
  currentAddress = "",
  savedAddresses,
  onDeleteSaved,
  partnerCoords,
  partnerId,
  hotelData,
  onOrderTypeChange,
  onDeliveryAddress,
  onConfirm,
  onClose,
}: OrderTypeLocationSheetProps) {
  const onAccent = readableTextColor(accent);
  const { userData: authUser } = useAuthStore();

  const types = useMemo(
    () => TYPE_META.filter((t) => availableTypes[t.key]),
    [availableTypes],
  );
  const firstType = types[0]?.key || "delivery";
  const defaultType =
    initialType && availableTypes[initialType] ? initialType : firstType;

  const [selected, setSelected] = useState<OrderTypeKey>(defaultType);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<
    { address?: string; coords: { lat: number; lng: number } } | null
  >(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reflect the default selection to the caller on mount (default = delivery).
  useEffect(() => {
    onOrderTypeChange?.(defaultType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock background scroll while open.
  useEffect(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = o; };
  }, []);

  const pickType = (t: OrderTypeKey) => {
    setSelected(t);
    onOrderTypeChange?.(t);
  };

  const runClosing = (cb: () => void) => {
    setClosing(true);
    setTimeout(cb, ANIM_MS);
  };

  const commitDelivery = useCallback(
    (addr: string, coords: { lat: number; lng: number } | null) => {
      runClosing(() => onDeliveryAddress(addr, coords));
    },
    [onDeliveryAddress],
  );

  const commitConfirm = () => runClosing(() => onConfirm(selected));

  const animateClose = () => {
    if (onClose) runClosing(onClose);
  };

  // Persist a freshly-saved address to the user's list + local cache, then commit.
  const persistAndCommit = useCallback(async (saved: SavedAddress) => {
    const fullAddress =
      saved.address ||
      [saved.flat_no, saved.house_no, saved.area, saved.city].filter(Boolean).join(", ");
    const coords =
      saved.latitude != null && saved.longitude != null
        ? { lat: saved.latitude, lng: saved.longitude }
        : null;
    if (coords) useLocationStore.getState().setCoords(coords);
    const stamped = { ...saved, savedAt: Date.now() };
    upsertLocalAddress(stamped, Date.now());
    if (authUser && (authUser as any).role === "user") {
      const existing = [ ...(((authUser as any).addresses || []) as SavedAddress[]) ];
      const idx = existing.findIndex((x) => x.id === stamped.id);
      if (idx >= 0) existing[idx] = stamped;
      else existing.push(stamped);
      try {
        await fetchFromHasura(updateUserAddressesMutation, { id: authUser.id, addresses: existing });
        useAuthStore.setState({ userData: { ...(authUser as any), addresses: existing } as any });
      } catch {
        toast.error("Failed to save address");
      }
    }
    setPickerOpen(false);
    commitDelivery(fullAddress, coords);
  }, [authUser, commitDelivery]);

  return (
    <>
      <div className="fixed inset-0 z-[600]" style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif" }}>
        {/* Backdrop */}
        <div
          onClick={animateClose}
          className="absolute inset-0 bg-black/45"
          style={{ opacity: !mounted || closing ? 0 : 1, transition: `opacity ${ANIM_MS}ms ease-out` }}
        />

        {/* Sheet — capped at ~half the screen; the address list scrolls inside. */}
        <div
          className="absolute bottom-0 left-0 right-0 mx-auto flex max-h-[55vh] max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-gray-50 shadow-2xl"
          style={{
            transform: !mounted || closing ? "translateY(100%)" : "translateY(0)",
            transition: `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          }}
        >
          {/* Handle + title */}
          <div className="shrink-0 bg-white pt-2">
            <div className="mx-auto mb-1.5 h-1 w-9 rounded-full bg-gray-200" />
            <div className="px-4 pb-0.5">
              <h2 className="text-[16px] font-extrabold tracking-tight text-gray-900">How would you like your order?</h2>
              <p className="mt-0.5 truncate text-[11px] font-medium text-gray-400">{storeName}</p>
            </div>

            {/* Order-type segmented tabs */}
            <div className="px-4 pb-2.5 pt-2">
              <div className="flex gap-2">
                {types.map((t) => {
                  const Icon = t.icon;
                  const active = selected === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => pickType(t.key)}
                      aria-pressed={active}
                      className="flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition active:scale-[0.98]"
                      style={
                        active
                          ? { backgroundColor: accent, borderColor: accent, color: onAccent }
                          : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#374151" }
                      }
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                      <span className="text-[12px] font-bold">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Body */}
          {selected === "delivery" ? (
            <div className="flex min-h-0 flex-1 flex-col pt-3">
              <AddressPickerBody
                currentAddress={currentAddress}
                onSelect={commitDelivery}
                onPickForMap={(addr, coords) => {
                  setPickerInitial(coords ? { address: addr, coords } : null);
                  setPickerOpen(true);
                }}
                onAddNew={() => {
                  setPickerInitial(null);
                  setPickerOpen(true);
                }}
                savedAddresses={savedAddresses}
                onDeleteSaved={onDeleteSaved}
                partnerCoords={partnerCoords}
                partnerId={partnerId}
                accent={accent}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/[0.04]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-gray-900">{storeName}</p>
                  {outletAddress && <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{outletAddress}</p>}
                  <p className="mt-1.5 text-[12px] font-medium text-gray-400">
                    {selected === "takeaway" ? "Pick up your order from this outlet." : "Reserve a table — pick your slot at checkout."}
                  </p>
                </div>
              </div>
              <button
                onClick={commitConfirm}
                className="mt-auto w-full rounded-2xl px-5 py-3.5 text-[15px] font-extrabold uppercase tracking-wider shadow-lg transition active:scale-[0.98]"
                style={{ backgroundColor: accent, color: onAccent }}
              >
                Start ordering
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map picker for new / searched delivery addresses */}
      <AddressPickerV2
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerInitial(null); }}
        onSaved={(saved) => { setPickerInitial(null); persistAndCommit(saved); }}
        hotelData={hotelData}
        accent={accent}
        initialPick={pickerInitial}
      />
    </>
  );
}
