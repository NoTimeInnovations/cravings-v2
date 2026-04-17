"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronRight, ExternalLink } from "lucide-react";

interface Notice {
  id: string;
  image_url: string;
  type: "fixed" | "scheduled";
  show_always: boolean;
  button_text?: string;
  button_link?: string;
  priority?: number;
}

interface NoticesOverlayProps {
  partnerId: string;
  notices: Notice[];
}

export default function NoticesOverlay({ partnerId, notices: allNotices }: NoticesOverlayProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ready, setReady] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!allNotices || allNotices.length === 0) {
      setDismissed(true);
      return;
    }

    const dismissedKey = `notices_dismissed_${partnerId}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);

    if (wasDismissed) {
      const alwaysNotices = allNotices.filter((n) => n.show_always);
      if (alwaysNotices.length > 0) {
        setNotices(alwaysNotices);
      } else {
        setDismissed(true);
        return;
      }
    } else {
      setNotices(allNotices);
    }

    setReady(true);
  }, [allNotices, partnerId]);

  const dismiss = useCallback(() => {
    setClosing(true);
    try {
      sessionStorage.setItem(`notices_dismissed_${partnerId}`, "1");
    } catch {}
    setTimeout(() => setDismissed(true), 300);
  }, [partnerId]);

  const goTo = useCallback((index: number) => {
    if (isAnimating) return;
    const width = containerRef.current?.offsetWidth || window.innerWidth;
    const direction = index > currentIndex ? -1 : 1;
    setIsAnimating(true);
    setSwipeOffset(direction * width);
    setTimeout(() => {
      setCurrentIndex(index);
      setSwipeOffset(0);
      setIsAnimating(false);
    }, 300);
  }, [currentIndex, isAnimating]);

  const goNext = useCallback(() => {
    if (currentIndex < notices.length - 1) {
      goTo(currentIndex + 1);
    } else {
      dismiss();
    }
  }, [currentIndex, notices.length, goTo, dismiss]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }, [currentIndex, goTo]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, [isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!isSwiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping.current = true;
    }
    if (isSwiping.current) {
      // Clamp at edges
      if (currentIndex === 0 && dx > 0) {
        setSwipeOffset(dx * 0.3);
      } else if (currentIndex === notices.length - 1 && dx < 0) {
        setSwipeOffset(dx * 0.3);
      } else {
        setSwipeOffset(dx);
      }
    }
  }, [isAnimating, currentIndex, notices.length]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current || isAnimating) {
      setSwipeOffset(0);
      return;
    }
    const threshold = (containerRef.current?.offsetWidth || window.innerWidth) * 0.25;
    if (swipeOffset < -threshold && currentIndex < notices.length - 1) {
      goTo(currentIndex + 1);
    } else if (swipeOffset > threshold && currentIndex > 0) {
      goTo(currentIndex - 1);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
    isSwiping.current = false;
  }, [swipeOffset, currentIndex, notices.length, goTo, isAnimating]);

  if (dismissed || !ready || notices.length === 0) return null;

  const current = notices[currentIndex];
  const prevNotice = currentIndex > 0 ? notices[currentIndex - 1] : null;
  const nextNotice = currentIndex < notices.length - 1 ? notices[currentIndex + 1] : null;
  const isLast = currentIndex === notices.length - 1;
  const total = notices.length;
  const width = typeof window !== "undefined" ? window.innerWidth : 400;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9998] overflow-hidden transition-opacity duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding track with prev + current + next */}
      <div
        className="absolute inset-0 flex"
        style={{
          width: `${width * 3}px`,
          transform: `translateX(${-width + swipeOffset}px)`,
          transition: isAnimating ? "transform 0.3s ease-out" : "none",
        }}
      >
        {/* Previous slide */}
        <div className="relative shrink-0" style={{ width, height: "100%" }}>
          {prevNotice && (
            <Image
              src={prevNotice.image_url}
              alt="Notice"
              fill
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>

        {/* Current slide */}
        <div className="relative shrink-0" style={{ width, height: "100%" }}>
          <Image
            key={current.id}
            src={current.image_url}
            alt="Notice"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Next slide */}
        <div className="relative shrink-0" style={{ width, height: "100%" }}>
          {nextNotice && (
            <Image
              src={nextNotice.image_url}
              alt="Notice"
              fill
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4">
        {total > 1 && (
          <div className="bg-black/40 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {total}
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={dismiss}
          className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress dots */}
      {total > 1 && (
        <div className="absolute top-14 left-0 right-0 z-10 flex items-center justify-center gap-1.5">
          {notices.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Bottom buttons */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8 flex items-center gap-3">
        {current.button_text && current.button_link ? (
          <a
            href={current.button_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            {current.button_text}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <div className="flex-1" />
        )}

        <button
          onClick={isLast ? dismiss : goNext}
          className="flex items-center justify-center gap-1 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 font-semibold py-3.5 px-6 rounded-xl transition-colors text-sm shrink-0"
        >
          {isLast ? "Close" : "Next"}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
