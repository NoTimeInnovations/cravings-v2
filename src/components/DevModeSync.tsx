"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { setDevMode } from "@/lib/devMode";

// Watches the ?dev query param across navigation and persists it to
// localStorage. ?dev=1 -> ON, ?dev=0 -> OFF, absent -> leave as-is.
// Mounted (inside a Suspense boundary) in the root layout so it runs on every page.
export default function DevModeSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const dev = searchParams.get("dev");
    if (dev === "1") setDevMode(true);
    else if (dev === "0") setDevMode(false);
  }, [searchParams]);

  return null;
}
