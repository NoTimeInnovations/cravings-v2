"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  NoticeCustomConfig,
  NoticeElement,
  NOTICE_REF_W,
  gradientCss,
} from "@/types/notices";

interface Props {
  config: NoticeCustomConfig;
  editable?: boolean;
  selectedId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onMoveElement?: (id: string, xPct: number, yPct: number) => void;
  onElementClick?: (el: NoticeElement) => void; // storefront: button navigation
  className?: string;
}

// Renders a notice's gradient background + movable text/button elements at a
// fixed 4:3 aspect. The SAME component powers the admin editor (editable drag)
// and the storefront (read-only), so what a partner designs is pixel-identical
// to what customers see. Font sizes are authored at NOTICE_REF_W and scaled to
// the actual rendered width.
export function NoticeCanvas({
  config,
  editable,
  selectedId,
  onSelectElement,
  onMoveElement,
  onElementClick,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(NOTICE_REF_W);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) if (e.contentRect.width) setW(e.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const scale = w / NOTICE_REF_W;

  const dragRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent, el: NoticeElement) => {
    if (!editable) return;
    e.stopPropagation();
    onSelectElement?.(el.id);
    dragRef.current = { id: el.id, startX: e.clientX, startY: e.clientY, ox: el.xPct, oy: el.yPct, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - d.startY) / rect.height) * 100;
    if (Math.abs(dxPct) > 0.3 || Math.abs(dyPct) > 0.3) d.moved = true;
    const nx = Math.max(0, Math.min(96, d.ox + dxPct));
    const ny = Math.max(0, Math.min(94, d.oy + dyPct));
    onMoveElement?.(d.id, Math.round(nx * 10) / 10, Math.round(ny * 10) / 10);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={ref}
      onPointerMove={editable ? onPointerMove : undefined}
      onPointerUp={editable ? onPointerUp : undefined}
      onClick={editable ? () => onSelectElement?.(null) : undefined}
      className={`relative w-full h-full overflow-hidden ${className || ""}`}
      style={{ background: gradientCss(config.gradient) }}
    >
      {config.elements.map((el) => {
        const selected = !!editable && selectedId === el.id;
        const base: React.CSSProperties = {
          position: "absolute",
          left: `${el.xPct}%`,
          top: `${el.yPct}%`,
          maxWidth: `${Math.max(20, 100 - el.xPct)}%`,
          textAlign: el.align || "left",
          cursor: editable ? "move" : el.kind === "button" ? "pointer" : "default",
          touchAction: editable ? "none" : undefined,
          userSelect: "none",
        };
        if (el.kind === "button") {
          const pad = Math.max(6, el.fontSize * scale * 0.5);
          return (
            <button
              key={el.id}
              type="button"
              onPointerDown={(e) => onPointerDown(e, el)}
              onClick={(e) => {
                e.stopPropagation();
                if (!editable) onElementClick?.(el);
              }}
              style={{
                ...base,
                fontSize: `${el.fontSize * scale}px`,
                background: el.bg || "#ffffff",
                color: el.textColor || "#111827",
                padding: `${pad}px ${pad * 1.8}px`,
                borderRadius: `${pad}px`,
                border: "none",
                fontWeight: el.bold ? 800 : 600,
                lineHeight: 1,
                whiteSpace: "nowrap",
                boxShadow: selected ? "0 0 0 2px #fff, 0 0 0 4px #3b82f6" : "0 4px 14px rgba(0,0,0,0.18)",
              }}
            >
              {el.text || "Button"}
            </button>
          );
        }
        return (
          <div
            key={el.id}
            onPointerDown={(e) => onPointerDown(e, el)}
            style={{
              ...base,
              fontSize: `${el.fontSize * scale}px`,
              color: el.color,
              fontWeight: el.bold ? 800 : 500,
              lineHeight: 1.15,
              whiteSpace: "pre-wrap",
              outline: selected ? "2px solid #3b82f6" : "none",
              outlineOffset: 3,
              borderRadius: 4,
            }}
          >
            {el.text || "Text"}
          </div>
        );
      })}
    </div>
  );
}
