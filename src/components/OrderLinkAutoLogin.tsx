"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { autoLoginFromOrderToken } from "@/app/actions/autoLoginFromOrderToken";
import { useAuthStore } from "@/store/authStore";

// Mounted on the storefront only when a valid WhatsApp order-link token carries
// a user id and nobody is logged in. Silently establishes the session (the
// server action sets the cookie), syncs the client auth store, then refreshes —
// no OTP, no visible UI.
export default function OrderLinkAutoLogin({
  partnerId,
  token,
}: {
  partnerId: string;
  token: string;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const ok = await autoLoginFromOrderToken(partnerId, token);
      if (!ok) return;
      try {
        await useAuthStore.getState().fetchUser();
      } catch {
        /* store will re-fetch on next mount */
      }
      router.refresh();
    })();
  }, [partnerId, token, router]);

  return null;
}
