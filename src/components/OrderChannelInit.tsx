"use client";

import { useEffect } from "react";
import { captureOrderChannel } from "@/lib/orderChannel";

/**
 * Captures, as early as possible on first load, whether the customer launched
 * from our TWA Android app vs the website (the android-app:// referrer is only
 * available on the initial load). See @/lib/orderChannel.
 */
export default function OrderChannelInit() {
  useEffect(() => {
    captureOrderChannel();
  }, []);
  return null;
}
