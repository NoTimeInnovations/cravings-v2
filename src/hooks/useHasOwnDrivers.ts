"use client";

import { useEffect, useState } from "react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getActiveDeliveryBoysQuery } from "@/api/deliveryBoys";
import { useAuthStore } from "@/store/authStore";

/**
 * True when the logged-in partner has at least one of their own *active*
 * delivery boys registered. Used to decide whether dispatching a delivery
 * order should open the driver-picker (AssignDriverDialog) instead of flipping
 * the status straight to "dispatched".
 *
 * Fetched once per partner; the count rarely changes within a session and the
 * picker itself re-fetches the live list when opened.
 */
export function useHasOwnDrivers(): boolean {
  const { userData } = useAuthStore();
  const [hasOwnDrivers, setHasOwnDrivers] = useState(false);

  useEffect(() => {
    const partnerId = userData?.id;
    if (!partnerId) {
      setHasOwnDrivers(false);
      return;
    }
    let cancelled = false;
    fetchFromHasura(getActiveDeliveryBoysQuery, { partner_id: partnerId })
      .then((res) => {
        if (!cancelled) {
          setHasOwnDrivers((res?.delivery_boys?.length ?? 0) > 0);
        }
      })
      .catch(() => {
        if (!cancelled) setHasOwnDrivers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userData?.id]);

  return hasOwnDrivers;
}
