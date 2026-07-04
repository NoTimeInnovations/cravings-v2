"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getActiveNoticesQuery } from "@/api/notices";
import { NoticeRow, RenderableNotice, toRenderable } from "@/types/notices";
import { NoticeCanvas } from "@/components/notices/NoticeCanvas";

// Storefront announcement modal. Shows on EVERY storefront open (no dismissal
// memory) when the partner has an active, in-schedule notice. 80vw x 60vh,
// rounded, with a close button. Renders poster / custom-canvas / legacy notices.
export function NoticeModal({ partnerId, ready = true }: { partnerId?: string; ready?: boolean }) {
  const [items, setItems] = useState<RenderableNotice[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    fetchFromHasura(getActiveNoticesQuery, { partner_id: partnerId })
      .then((res: any) => {
        if (cancelled) return;
        const rows = (res?.notices || []) as NoticeRow[];
        const renderable = rows.map(toRenderable).filter(Boolean) as RenderableNotice[];
        if (renderable.length) setItems(renderable);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  // Open once we have notices AND the storefront is ready (splash/onboarding
  // dismissed) — so the notice never sits invisibly behind the onboarding
  // overlay. Once the customer closes it, it stays closed for this page view.
  useEffect(() => {
    if (ready && items.length && !dismissed) setOpen(true);
  }, [ready, items, dismissed]);

  const close = () => {
    setDismissed(true);
    setOpen(false);
  };

  if (!open || !items.length) return null;
  const item = items[Math.min(idx, items.length - 1)];

  const go = (n: number) => setIdx((i) => (i + n + items.length) % items.length);
  const openLink = (link?: string | null) => {
    const l = (link || "").trim();
    if (!l) return;
    // Only allow http(s) URLs (new tab) or same-origin paths (same tab). Reject
    // javascript:/data:/etc. AND protocol-relative //host or /\host (which
    // browsers navigate off-site) so a notice link can never run script or
    // silently redirect off the storefront.
    if (/^https?:\/\//i.test(l)) window.open(l, "_blank", "noopener,noreferrer");
    else if (l.startsWith("/") && !/^\/[\\/]/.test(l)) window.location.href = l;
  };

  const boxClass =
    item.kind === "custom"
      ? "relative w-[min(90vw,106vh)] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      : "relative w-[90vw] h-[80vh] max-w-[1200px] rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      <div className={boxClass}>
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 rounded-full bg-black/40 hover:bg-black/60 text-white p-2 backdrop-blur transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {item.kind === "poster" ? (
          <button
            type="button"
            onClick={() => openLink(item.link)}
            className="relative block w-full h-full"
            style={{ cursor: item.link ? "pointer" : "default" }}
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="90vw"
              priority
              className="object-cover"
            />
          </button>
        ) : item.kind === "custom" ? (
          <NoticeCanvas config={item.config} onElementClick={(el) => openLink(el.link)} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            {item.tag && (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 mb-4">
                {item.tag}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold">{item.title}</h2>
            {item.description && <p className="mt-3 text-white/80 max-w-lg">{item.description}</p>}
            {item.link && (
              <button
                onClick={() => openLink(item.link)}
                className="mt-6 px-6 py-2.5 rounded-full bg-white text-slate-900 font-semibold hover:bg-white/90"
              >
                Open
              </button>
            )}
          </div>
        )}

        {items.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/40 hover:bg-black/60 text-white p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/40 hover:bg-black/60 text-white p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
