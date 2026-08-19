"use client";

import { cn } from "@/lib/utils";

/** Rider profile photo (presigned) with an initials fallback. */
export default function RiderAvatar({
  url,
  name,
  size = 32,
  className,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  /**
   * Overrides the initials-fallback palette. Defaults to the orange admin-v2 and
   * superadmin have always used, so those screens are unchanged; admin-v3 passes
   * its zinc tokens instead. Merged with tailwind-merge, so a bg-/text- class
   * here replaces the default rather than fighting it.
   */
  className?: string;
}) {
  const initial = (name || "R").toString().trim()[0]?.toUpperCase() || "R";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        "bg-orange-100 text-orange-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name || "rider"} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
