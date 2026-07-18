"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";

/**
 * V6 ("Grocery") promo-banner carousel — shown above Categories when the partner
 * has uploaded banners (delivery_rules.carousel_banners). Full-width, rounded,
 * soft-shadowed, with finger-drag + snap, gentle auto-advance, infinite loop,
 * and elegant accent pill dots. A single banner is
 * static (no dots / auto-advance); videos autoplay muted+looped.
 *
 * Banners are cropped ~1131:583 in the dashboard, so the frame uses that aspect
 * (no letterboxing). Structure mirrors DefaultBannerCarousel, restyled for V6.
 */
export function V6BannerCarousel({ banners, accent }: { banners: string[]; accent: string }) {
  const items = useMemo(() => (banners || []).filter(Boolean).slice(0, 6), [banners]);
  const count = items.length;
  const isMultiple = count > 1;

  // Clone last->front and first->end so the slide loop wraps seamlessly.
  const extended = useMemo(
    () => (isMultiple ? [items[count - 1], ...items, items[0]] : items),
    [items, count, isMultiple],
  );

  const [index, setIndex] = useState(isMultiple ? 1 : 0);
  const [transitioning, setTransitioning] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef(0);
  const deltaX = useRef(0);
  const realIndex = isMultiple ? (index - 1 + count) % count : 0;

  const resetAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (!isMultiple) return;
    autoRef.current = setInterval(() => {
      setTransitioning(true);
      setIndex((p) => p + 1);
    }, 4500);
  }, [isMultiple]);

  useEffect(() => {
    resetAuto();
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [resetAuto]);

  // Jump (without animating) when we land on a cloned edge slide.
  useEffect(() => {
    if (!isMultiple) return;
    if (index === 0 || index === count + 1) {
      const t = setTimeout(() => {
        setTransitioning(false);
        setIndex(index === 0 ? count : 1);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [index, count, isMultiple]);

  // Re-enable the transition after an instant edge jump.
  useEffect(() => {
    if (!transitioning) {
      const t = setTimeout(() => setTransitioning(true), 50);
      return () => clearTimeout(t);
    }
  }, [transitioning]);

  const goTo = (i: number) => {
    setTransitioning(true);
    setIndex(i + 1);
    resetAuto();
  };

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-2xl bg-gray-100 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.05]"
      style={{ aspectRatio: "1131 / 583" }}
      onTouchStart={
        isMultiple
          ? (e) => {
              touchX.current = e.touches[0].clientX;
              deltaX.current = 0;
              if (autoRef.current) clearInterval(autoRef.current);
            }
          : undefined
      }
      onTouchMove={
        isMultiple
          ? (e) => {
              deltaX.current = e.touches[0].clientX - touchX.current;
              if (trackRef.current) {
                const w = trackRef.current.parentElement?.offsetWidth || 0;
                trackRef.current.style.transition = "none";
                trackRef.current.style.transform = `translateX(${-index * w + deltaX.current}px)`;
              }
            }
          : undefined
      }
      onTouchEnd={
        isMultiple
          ? () => {
              setTransitioning(true);
              if (trackRef.current) {
                trackRef.current.style.transition = "";
                trackRef.current.style.transform = "";
              }
              if (deltaX.current < -50) setIndex((p) => p + 1);
              else if (deltaX.current > 50) setIndex((p) => p - 1);
              resetAuto();
            }
          : undefined
      }
    >
      <div
        ref={trackRef}
        className="flex h-full"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: transitioning ? "transform 600ms cubic-bezier(.4,.0,.2,1)" : "none",
        }}
      >
        {extended.map((url, idx) => (
          <div key={idx} className="relative h-full w-full flex-shrink-0 overflow-hidden">
            {isVideoUrl(url) ? (
              <video
                src={url}
                poster={getVideoThumbnailUrl(url)}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${url}")` }}
                role="img"
                aria-label={`Promotion ${idx + 1}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Elegant pill dots */}
      {isMultiple && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {items.map((_, i) => {
            const active = realIndex === i;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to promotion ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: active ? 22 : 6,
                  height: 6,
                  backgroundColor: active ? accent : "rgba(255,255,255,0.7)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                }}
              />
            );
          })}
        </div>
      )}

    </div>
  );
}

export default V6BannerCarousel;
