"use client";

import { useState } from "react";

/**
 * Gallery image with a graceful fallback. Hero collage and gallery items[0..3]
 * start out as the same Google photo at signup but diverge once the partner
 * edits the hero. If the gallery URL is empty or broken, drop back to the
 * matching hero collage image so customers never see a broken-image icon.
 */
export function GalleryImageV4({
  src,
  fallbackSrc,
  alt,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
}) {
  const initial = src || fallbackSrc || "";
  const [current, setCurrent] = useState(initial);
  if (!current) return null;
  return (
    <img
      src={current}
      alt={alt}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        }
      }}
    />
  );
}
