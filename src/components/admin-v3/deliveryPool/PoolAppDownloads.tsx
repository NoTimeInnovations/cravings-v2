"use client";

import * as React from "react";
import { Apple, Smartphone } from "lucide-react";

import { AdminV3Button } from "../ui/primitives";

/**
 * The two Delivery Pool rider-app store links, as v3 controls.
 *
 * admin-v2 renders these through `components/admin-v2/DeliveryAppDownloads`,
 * whose trigger is a shadcn `Button variant="outline"`. That button is built on
 * the repo's CSS tokens (`--background`, `--border`), which in dark mode resolve
 * DARKER than a v3 card — so it reads as a hole in a `dark:bg-zinc-900` card —
 * and it uses a different radius/height/text scale than `AdminV3Button`.
 * v2 is not ours to restyle, so v3 renders its own pair of buttons instead.
 *
 * The URLs are the same ones DeliveryAppDownloads holds for the `pool` app;
 * keep them in step with `DELIVERY_APPS.pool` there.
 */
const POOL_APP = {
  android:
    "https://drive.google.com/file/d/1EJdOjkHEytoT0y80tfabwgj0TSob10-K/view?usp=sharing",
  ios: "https://apps.apple.com/in/app/menuthere-go/id6784290207",
} as const;

const openLink = (url: string) =>
  window.open(url, "_blank", "noopener,noreferrer");

export function PoolAppDownloads() {
  return (
    <>
      <AdminV3Button
        variant="secondary"
        onClick={() => openLink(POOL_APP.android)}
      >
        <Smartphone size={15} strokeWidth={1.8} />
        Rider app · Android
      </AdminV3Button>
      <AdminV3Button variant="secondary" onClick={() => openLink(POOL_APP.ios)}>
        <Apple size={15} strokeWidth={1.8} />
        Rider app · iOS
      </AdminV3Button>
    </>
  );
}
