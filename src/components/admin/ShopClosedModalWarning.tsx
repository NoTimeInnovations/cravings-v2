"use client";

import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";
import {
  describeNextOpen,
  isStoreOpen,
  localNow,
  storeHoursFromSettings,
} from "@/lib/storeHours";
import Link from "next/link";
import { Moon, Phone } from "lucide-react";

const formatOwnerLabel = (name?: string | null) => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "the owner";
  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
};

/**
 * Two different ways a shop is shut, one sign.
 *
 * `isShopOpen` is the manual switch the partner flips. `storefrontSettings`
 * carries the working-hours schedule, which closes the shop on its own outside
 * business hours — evaluated in the STORE's timezone, and re-checked on a timer
 * because a customer who opens the menu at 8:55 should watch it unlock at 9:00
 * rather than sit behind a sign that is no longer true.
 *
 * The schedule is deliberately advisory-by-default: no schedule, or one that is
 * switched off, leaves this entirely to the manual switch — which is how every
 * store behaved before working hours existed.
 */
const ShopClosedModalWarning = ({
  isShopOpen,
  hotelId,
  partnerPhone,
  partnerName,
  storefrontSettings,
  timezone,
}: {
  isShopOpen: boolean;
  hotelId: string;
  partnerPhone?: string | null;
  partnerName?: string | null;
  /** The partner's storefront_settings blob; the schedule lives inside it. */
  storefrontSettings?: unknown;
  /** Store IANA timezone. Hours mean the shop's clock, not the visitor's. */
  timezone?: string | null;
}) => {
  const { userData } = useAuthStore();
  const tz = timezone || "Asia/Kolkata";

  // Re-evaluated every 30s so the sign clears itself at opening time. Cheap: no
  // network, just arithmetic on the stored schedule.
  // Dismissible ON PURPOSE. The order-type screen invites the customer to browse
  // the menu; a sign they cannot get past turns that into a dead end. Ordering is
  // blocked at the checkout itself (storeIsClosedNow in both place-order modals),
  // so letting them look around costs nothing and is how they decide to come back.
  const [dismissed, setDismissed] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const hours = React.useMemo(
    () => storeHoursFromSettings(storefrontSettings),
    [storefrontSettings],
  );
  const schedule = React.useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => isStoreOpen(hours, tz),
    [hours, tz, tick],
  );
  const nextOpen = schedule.open ? null : describeNextOpen(schedule, localNow(tz).date);

  if (isShopOpen && schedule.open) return null;
  if (dismissed) return null;

  const ownerLabel = formatOwnerLabel(partnerName);

  return (
    <>
      {/* A shop that is shut for the night is not an error. The old treatment —
          a bouncing red ribbon with a warning triangle — read like something had
          gone wrong, on top of a menu the customer is welcome to browse. This is
          the same hard block, said quietly. */}
      <div className="fixed inset-0 z-[52] bg-gray-900/45 backdrop-blur-[3px]" />

      <div className="fixed inset-0 z-[54] flex items-end justify-center p-4 sm:items-center">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="px-6 pb-6 pt-7 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
              <Moon className="h-5 w-5 text-gray-700" />
            </span>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-500">
                Closed right now
              </span>
            </div>

            {/* The reopening time IS the headline when we know it — it is the one
                thing the customer came to find out. Only the schedule can tell us;
                a manual close has no time to promise. */}
            <h3 className="mt-2 text-[19px] font-semibold leading-snug tracking-tight text-gray-900">
              {isShopOpen && nextOpen ? nextOpen : `${partnerName || "The store"} is not taking orders`}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
              {isShopOpen && nextOpen
                ? "You can look through the menu in the meantime."
                : "Please check back a little later."}
            </p>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl bg-gray-900 text-[15px] font-medium text-white transition active:scale-[0.98]"
            >
              Browse the menu
            </button>

            {partnerPhone && (
              <a
                href={`tel:${partnerPhone}`}
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 text-[15px] font-medium text-gray-700 transition active:scale-[0.98]"
              >
                <Phone className="h-4 w-4" />
                Call {partnerPhone}
              </a>
            )}
            {partnerPhone && (
              <p className="mt-2 text-[11px] text-gray-400">
                <span translate="no" className="notranslate">{ownerLabel}</span> phone number
              </p>
            )}

            {/* The owner looking at their own shop gets the way back in. */}
            {userData?.id === hotelId && (
              <Link
                href="/profile"
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-gray-200 text-[14px] font-medium text-gray-700 transition active:scale-[0.98]"
              >
                Open my store
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ShopClosedModalWarning;
