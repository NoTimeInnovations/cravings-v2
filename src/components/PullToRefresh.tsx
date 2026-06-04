"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ArrowDown } from "lucide-react";

/**
 * Pull-to-refresh for window-scrolled pages (e.g. the V3 storefront). When the
 * page is scrolled to the very top and the user drags down past `threshold`,
 * the page reloads. Renders a small indicator that follows the pull.
 *
 * Mount once inside a window-scrolled layout. No-op on desktop (no touch).
 */
export default function PullToRefresh({
  threshold = 70,
  onRefresh,
}: {
  threshold?: number;
  onRefresh?: () => void;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const atTop = () =>
      (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

    const onStart = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      // Only arm the gesture when the page is at the top AND the finger starts
      // in the top 20% of the screen — a drag begun mid/lower screen never
      // triggers a refresh.
      if (refreshingRef.current || !atTop() || y > window.innerHeight * 0.2) {
        startY.current = null;
        return;
      }
      startY.current = y;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && atTop()) {
        // Rubber-band resistance, capped a bit past the threshold.
        const dist = Math.min(dy * 0.5, threshold * 1.6);
        pullRef.current = dist;
        setPull(dist);
        if (dist > 4 && e.cancelable) e.preventDefault();
      } else if (dy <= 0) {
        startY.current = null;
        if (pullRef.current !== 0) {
          pullRef.current = 0;
          setPull(0);
        }
      }
    };

    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current >= threshold && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(threshold);
        if (onRefresh) onRefresh();
        else window.location.reload();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [threshold, onRefresh]);

  if (pull <= 0 && !refreshing) return null;

  const ready = pull >= threshold || refreshing;
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[2000] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pull, threshold * 1.6) - 8}px)`,
        transition: startY.current == null ? "transform 0.15s ease-out" : "none",
      }}
    >
      <div className="mt-1 rounded-full bg-white shadow-md p-2 border border-gray-100">
        {refreshing ? (
          <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
        ) : (
          <ArrowDown
            className="h-5 w-5 text-orange-500 transition-transform"
            style={{ transform: ready ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </div>
    </div>
  );
}
