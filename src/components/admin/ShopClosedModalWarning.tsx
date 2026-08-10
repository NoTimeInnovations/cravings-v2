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

  const ownerLabel = formatOwnerLabel(partnerName);

  return (
    <>
      {/* Background overlay with blur */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[52]"></div>

      {/* Centered modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[54]">
        <div className="max-w-2xl w-full mx-4">
          {/* Banner with ribbon ends */}
          <div className="relative bg-red-600 text-white py-4 px-6 rounded-md shadow-xl animate-bounce">
            {/* Ribbon ends */}
            <div className="absolute -top-2 left-0 w-0 h-0
                border-l-[15px] border-l-transparent
                border-b-[15px] border-b-red-800
                border-r-[15px] border-r-transparent">
            </div>
            <div className="absolute -top-2 right-0 w-0 h-0
                border-l-[15px] border-l-transparent
                border-b-[15px] border-b-red-800
                border-r-[15px] border-r-transparent">
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-center">SHOP CURRENTLY CLOSED</h3>
              </div>
              <p className="mt-2 text-center">This hotel is not accepting orders at the moment</p>
              {/* Only shown when the SCHEDULE is what shut the shop. After a manual
                  close there is no reopening time to promise, and inventing one is
                  worse than saying nothing. */}
              {isShopOpen && nextOpen && (
                <p className="mt-1 text-center font-semibold">{nextOpen}</p>
              )}

              {partnerPhone && (
                <div className="mt-3 text-center">
                  <a
                    href={`tel:${partnerPhone}`}
                    className="inline-flex items-center gap-2 bg-white text-red-600 hover:bg-gray-100 font-semibold py-2 px-5 rounded-full shadow-md transition-all duration-200 transform hover:scale-105"
                  >
                    Call {partnerPhone}
                  </a>
                  <p className="text-xs text-white/90 mt-2">
                    This is <span translate="no" className="notranslate">{ownerLabel}</span> phone number
                  </p>
                </div>
              )}

              {userData?.id === hotelId && (
                <Link
                  href="/profile"
                  className="mt-3 bg-white text-red-600 hover:bg-gray-100 font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  Open My Hotel
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ShopClosedModalWarning;
