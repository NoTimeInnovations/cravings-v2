"use client";
import React from "react";
import { accentTileGradient } from "./v6utils";

/**
 * V6 ("Grocery") category tile — a rounded square with a representative menu-item
 * image floating over a soft accent gradient, and the category name below. Falls
 * back to a gradient-only tile (with the category initial) when no image exists.
 * Used both in the Home horizontal rail (compact) and the Categories grid (full).
 */
export function V6CategoryTile({
  name,
  imageUrl,
  accent,
  active = false,
  variant = "rail",
  onClick,
}: {
  name: string;
  imageUrl?: string | null;
  accent: string;
  active?: boolean;
  variant?: "rail" | "grid";
  onClick?: () => void;
}) {
  const isRail = variant === "rail";
  const tileSize = isRail ? 54 : undefined;
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={`group flex shrink-0 flex-col items-center gap-1 focus:outline-none ${isRail ? "w-[58px]" : "w-full"}`}
      aria-label={name}
    >
      <div
        className={`relative overflow-hidden transition-all duration-300 ${isRail ? "rounded-xl" : "aspect-square w-full rounded-[22px]"} ${active ? "ring-2 ring-offset-2" : "ring-1 ring-black/[0.05]"} group-active:scale-95`}
        style={{
          width: isRail ? tileSize : undefined,
          height: isRail ? tileSize : undefined,
          background: accentTileGradient(accent, name),
          ...(active ? ({ ["--tw-ring-color" as any]: accent } as React.CSSProperties) : {}),
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span
              className={`font-extrabold ${isRail ? "text-2xl" : "text-4xl"}`}
              style={{ color: accent }}
            >
              {initial}
            </span>
          </div>
        )}
      </div>
      <span
        className={`w-full truncate text-center font-semibold leading-tight ${isRail ? "text-[10.5px]" : "text-[13px]"}`}
        style={{ color: active ? accent : "#374151" }}
      >
        {name}
      </span>
    </button>
  );
}

export default V6CategoryTile;
