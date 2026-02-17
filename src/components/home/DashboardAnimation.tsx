"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/* ── Animated Cursor ── */
function AnimCursor({
  x,
  y,
  clicking,
  visible,
  duration,
}: {
  x: number;
  y: number;
  clicking: boolean;
  visible: boolean;
  duration: string;
}) {
  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px) ${clicking ? "scale(0.8)" : "scale(1)"}`,
        opacity: visible ? 1 : 0,
        transition: `transform ${duration} cubic-bezier(0.25, 0.1, 0.25, 1), opacity 400ms ease`,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 00-.85.35z"
          fill="#1a1a1a"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      {clicking && (
        <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-[#B5581A]/20 animate-ping" />
      )}
    </div>
  );
}

/* ── Constants ── */
const ITEM_NAME = "Smoked BBQ Brisket";

type Phase =
  | "start"
  | "move-to-input"
  | "typing"
  | "typed-pause"
  | "move-to-save"
  | "hover-save"
  | "click-save"
  | "saving"
  | "saved"
  | "move-to-offer"
  | "hover-offer"
  | "click-offer"
  | "dialog-open"
  | "dialog-typing"
  | "move-to-apply"
  | "hover-apply"
  | "click-apply"
  | "offer-adding"
  | "offer-added"
  | "hold";

/* ── Sidebar Icons ── */
function SidebarIcons({ activeIndex }: { activeIndex: number }) {
  const icons = [
    <svg key="0" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5" /><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5" /><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5" /><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5" /></svg>,
    <svg key="1" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    <svg key="2" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>,
    <svg key="3" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    <svg key="4" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth="1.5" /></svg>,
  ];
  return (
    <>
      {icons.map((icon, i) => (
        <div
          key={i}
          className={`flex items-center justify-center w-full py-2.5 transition-colors ${
            i === activeIndex ? "text-[#B5581A] bg-[#F4E0D0]/50" : "text-stone-400"
          }`}
        >
          {icon}
        </div>
      ))}
    </>
  );
}

/* ── Compact-style Menu Preview ── */
function MenuPreview({
  typedText,
  showOfferBadge,
}: {
  typedText: string;
  showOfferBadge: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Mini banner */}
      <div className="relative w-full h-10 md:h-16 bg-gradient-to-br from-[#B5581A] to-[#8B3F10] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
        <span className="text-white font-handwriting text-[10px] md:text-lg font-bold drop-shadow-sm relative z-10">
          Oakwood Grill
        </span>
      </div>

      {/* Store info */}
      <div className="px-2 md:px-3 pt-1.5 md:pt-2.5 pb-1 md:pb-1.5">
        <p className="text-[8px] md:text-xs font-semibold text-stone-900">Oakwood Grill</p>
        <div className="flex items-center gap-0.5 md:gap-1 text-stone-500">
          <svg className="w-2 h-2 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[6px] md:text-[9px]">Brooklyn, New York</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0 px-1 md:px-2 border-b border-stone-100 overflow-hidden">
        {["Must Try", "Appetizers", "Entrees"].map((cat, i) => (
          <div
            key={cat}
            className={`px-1.5 md:px-2.5 py-1 md:py-1.5 text-[6px] md:text-[9px] font-medium whitespace-nowrap border-b-[1.5px] transition-colors ${
              i === 2
                ? "text-[#B5581A] border-[#B5581A]"
                : "text-stone-400 border-transparent"
            }`}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Category heading */}
      <div className="px-2 md:px-3 pt-1.5 md:pt-2.5 pb-1 md:pb-1">
        <p className="text-[7px] md:text-[10px] font-bold text-[#B5581A]">Entrees</p>
      </div>

      {/* Menu items list */}
      <div className="flex-1 overflow-hidden">
        {/* Item 1: Smoked BBQ Brisket (live editing) */}
        <div className="flex justify-between px-2 md:px-3 py-1.5 md:py-2 border-b border-stone-50">
          <div className="flex-1 min-w-0 pr-1.5 md:pr-2">
            <div className="flex items-center gap-1">
              <p className="text-[7px] md:text-[11px] font-semibold text-stone-900 truncate min-h-[10px] md:min-h-[14px] transition-all duration-200">
                {typedText || <span className="text-stone-300 italic">Item Name</span>}
              </p>
            </div>
            <p className="text-[6px] md:text-[8px] text-stone-400 mt-0.5 line-clamp-1">
              Slow-smoked 12hr Texas-style brisket
            </p>
            <div className="flex items-center gap-1 mt-0.5 md:mt-1">
              <span
                className={`font-bold transition-all duration-300 ${
                  showOfferBadge
                    ? "text-stone-400 line-through text-[6px] md:text-[8px]"
                    : "text-[#B5581A] text-[8px] md:text-[11px]"
                }`}
              >
                $18.00
              </span>
              {showOfferBadge && (
                <>
                  <span className="text-[8px] md:text-[11px] font-bold text-red-500 animate-[fadeSlideIn_0.4s_ease-out]">
                    $12.60
                  </span>
                  <span className="text-[5px] md:text-[7px] bg-red-500 text-white px-0.5 md:px-1 py-px rounded font-bold animate-[fadeSlideIn_0.4s_ease-out]">
                    30% OFF
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0">
            <img src="/dashboard/brisket.webp" alt="Smoked BBQ Brisket" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Item 2: Classic Cheeseburger (static) */}
        <div className="flex justify-between px-2 md:px-3 py-1.5 md:py-2 border-b border-stone-50">
          <div className="flex-1 min-w-0 pr-1.5 md:pr-2">
            <div className="flex items-center gap-1">
              <p className="text-[7px] md:text-[11px] font-semibold text-stone-900">Classic Cheeseburger</p>
            </div>
            <p className="text-[6px] md:text-[8px] text-stone-400 mt-0.5 line-clamp-1">
              Angus beef patty, cheddar, brioche bun
            </p>
            <p className="text-[8px] md:text-[11px] font-bold text-[#B5581A] mt-0.5 md:mt-1">$14.00</p>
          </div>
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0">
            <img src="/dashboard/burger.webp" alt="Classic Cheeseburger" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Item 3: Grilled Salmon (static, faded) */}
        <div className="flex justify-between px-2 md:px-3 py-1.5 md:py-2 opacity-50">
          <div className="flex-1 min-w-0 pr-1.5 md:pr-2">
            <div className="flex items-center gap-1">
              <p className="text-[7px] md:text-[11px] font-semibold text-stone-900">Grilled Salmon</p>
            </div>
            <p className="text-[6px] md:text-[8px] text-stone-400 mt-0.5 line-clamp-1">
              Atlantic salmon, lemon herb butter
            </p>
            <p className="text-[8px] md:text-[11px] font-bold text-[#B5581A] mt-0.5 md:mt-1">$22.00</p>
          </div>
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0">
            <img src="/dashboard/salmon.webp" alt="Grilled Salmon" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inner Animation (keyed to cycle) ── */
function DashboardAnimationInner({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [typedText, setTypedText] = useState("");
  const [discountTyped, setDiscountTyped] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);
  const offerRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState({ x: -30, y: -30 });

  const getCenter = useCallback(
    (ref: React.RefObject<HTMLDivElement | null>) => {
      const c = containerRef.current;
      const el = ref.current;
      if (!c || !el) return { x: -30, y: -30 };
      const cR = c.getBoundingClientRect();
      const eR = el.getBoundingClientRect();
      return {
        x: eR.left - cR.left + eR.width * 0.55,
        y: eR.top - cR.top + eR.height * 0.55,
      };
    },
    []
  );

  /* Item name typing effect */
  useEffect(() => {
    if (phase !== "typing") return;
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setTypedText(ITEM_NAME.slice(0, idx));
      if (idx >= ITEM_NAME.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [phase]);

  /* Discount typing effect */
  useEffect(() => {
    if (phase !== "dialog-typing") return;
    const chars = "30";
    let idx = 0;
    setDiscountTyped("");
    const interval = setInterval(() => {
      idx++;
      setDiscountTyped(chars.slice(0, idx));
      if (idx >= chars.length) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, [phase]);

  /* Phase timeline */
  useEffect(() => {
    const t: NodeJS.Timeout[] = [];
    const TYPE_DUR = ITEM_NAME.length * 80;

    setTypedText("");
    setDiscountTyped("");
    setPhase("start");
    setCursorPos({ x: -30, y: -30 });

    t.push(setTimeout(() => { setCursorPos(getCenter(inputRef)); setPhase("move-to-input"); }, 500));
    t.push(setTimeout(() => setPhase("typing"), 2000));

    const afterType = 2000 + TYPE_DUR + 400;
    t.push(setTimeout(() => setPhase("typed-pause"), afterType));
    t.push(setTimeout(() => { setCursorPos(getCenter(saveRef)); setPhase("move-to-save"); }, afterType + 300));
    t.push(setTimeout(() => setPhase("hover-save"), afterType + 1300));
    t.push(setTimeout(() => setPhase("click-save"), afterType + 1600));
    t.push(setTimeout(() => setPhase("saving"), afterType + 1800));
    t.push(setTimeout(() => setPhase("saved"), afterType + 2800));
    t.push(setTimeout(() => { setCursorPos(getCenter(offerRef)); setPhase("move-to-offer"); }, afterType + 3400));
    t.push(setTimeout(() => setPhase("hover-offer"), afterType + 4600));
    t.push(setTimeout(() => setPhase("click-offer"), afterType + 4900));
    t.push(setTimeout(() => setPhase("dialog-open"), afterType + 5200));
    t.push(setTimeout(() => setPhase("dialog-typing"), afterType + 5800));
    t.push(setTimeout(() => { setCursorPos(getCenter(applyRef)); setPhase("move-to-apply"); }, afterType + 6400));
    t.push(setTimeout(() => setPhase("hover-apply"), afterType + 7400));
    t.push(setTimeout(() => setPhase("click-apply"), afterType + 7700));
    t.push(setTimeout(() => setPhase("offer-adding"), afterType + 7900));
    t.push(setTimeout(() => setPhase("offer-added"), afterType + 8700));
    t.push(setTimeout(() => setPhase("hold"), afterType + 9500));
    t.push(setTimeout(onComplete, afterType + 11500));

    return () => t.forEach(clearTimeout);
  }, [onComplete, getCenter]);

  /* Derived states */
  const isTyping = phase === "typing" || phase === "move-to-input";
  const inputFocused = isTyping || phase === "typed-pause";

  const saveState =
    phase === "saving" ? "saving"
    : ["saved","move-to-offer","hover-offer","click-offer","dialog-open","dialog-typing","move-to-apply","hover-apply","click-apply","offer-adding","offer-added","hold"].includes(phase) ? "saved"
    : phase === "hover-save" ? "hover"
    : phase === "click-save" ? "clicking"
    : "default";

  const showDialog = ["dialog-open","dialog-typing","move-to-apply","hover-apply","click-apply"].includes(phase);

  const offerState =
    phase === "offer-adding" ? "adding"
    : ["offer-added","hold"].includes(phase) ? "added"
    : phase === "hover-offer" ? "hover"
    : phase === "click-offer" ? "clicking"
    : "default";

  const applyState =
    phase === "hover-apply" ? "hover"
    : phase === "click-apply" ? "clicking"
    : "default";

  const showOfferBadge = ["offer-added","hold"].includes(phase);
  const cursorVisible = !["start","hold"].includes(phase);
  const cursorClicking = ["click-save","click-offer","click-apply"].includes(phase);
  const cursorDuration =
    phase === "start" ? "0ms"
    : phase === "move-to-input" ? "1400ms"
    : phase === "typing" || phase === "typed-pause" ? "0ms"
    : phase === "move-to-save" ? "1000ms"
    : phase === "move-to-offer" ? "1200ms"
    : phase === "move-to-apply" ? "1000ms"
    : "150ms";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Window frame — reduced border radius */}
      <div
        className="relative w-full rounded-t-md md:rounded-t-lg rounded-b-none border border-stone-200/80 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] overflow-visible"
        style={{
          transform: "perspective(1200px) rotateX(2deg)",
          transformOrigin: "center bottom",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 border-b border-stone-100 bg-stone-50/80 rounded-t-md md:rounded-t-lg">
          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#FF5F57]" />
          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#FEBC2E]" />
          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#28C840]" />
          <span className="ml-2 md:ml-3 text-[9px] md:text-xs text-stone-400 font-medium tracking-wide">
            Menuthere Dashboard
          </span>
        </div>

        {/* Body */}
        <div className="flex min-h-[280px] md:min-h-[380px]">
          {/* Sidebar — desktop only */}
          <div className="hidden md:flex flex-col w-[52px] border-r border-stone-100 bg-stone-50/30 pt-3 gap-0.5">
            <SidebarIcons activeIndex={1} />
          </div>

          {/* ── Edit Panel ── */}
          <div className="flex-1 p-3 md:p-5 overflow-visible relative">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <h3 className="text-[10px] md:text-sm font-semibold text-stone-800">Edit Menu Item</h3>
            </div>

            {/* Item Name */}
            <div className="mb-2 md:mb-3">
              <label className="text-[8px] md:text-[11px] font-medium text-stone-500 mb-0.5 md:mb-1 block">Item Name</label>
              <div
                ref={inputRef}
                className={`h-6 md:h-9 rounded-md border px-2 md:px-3 flex items-center text-[9px] md:text-sm transition-all duration-300 ${
                  inputFocused ? "border-[#B5581A]/50 ring-2 ring-[#B5581A]/10 bg-white" : "border-stone-200 bg-stone-50"
                }`}
              >
                <span className="text-stone-900">{typedText}</span>
                {inputFocused && <span className="inline-block w-px md:w-[1.5px] h-2.5 md:h-4 bg-stone-800 ml-0.5 animate-pulse" />}
                {!typedText && !inputFocused && <span className="text-stone-400">e.g. Smoked BBQ Brisket</span>}
              </div>
            </div>

            {/* Price */}
            <div className="mb-2 md:mb-3">
              <label className="text-[8px] md:text-[11px] font-medium text-stone-500 mb-0.5 md:mb-1 block">Price</label>
              <div className="h-6 md:h-9 rounded-md border border-stone-200 bg-stone-50 px-2 md:px-3 flex items-center text-[9px] md:text-sm text-stone-900">$18.00</div>
            </div>

            {/* Category */}
            <div className="mb-2 md:mb-3">
              <label className="text-[8px] md:text-[11px] font-medium text-stone-500 mb-0.5 md:mb-1 block">Category</label>
              <div className="h-6 md:h-9 rounded-md border border-stone-200 bg-stone-50 px-2 md:px-3 flex items-center text-[9px] md:text-sm text-stone-900">Entrees</div>
            </div>

            {/* Image */}
            <div className="mb-2.5 md:mb-4">
              <label className="text-[8px] md:text-[11px] font-medium text-stone-500 mb-0.5 md:mb-1 block">Image</label>
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-md border border-dashed border-stone-300 overflow-hidden">
                <img src="/dashboard/brisket.webp" alt="Smoked BBQ Brisket" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1.5 md:gap-2 relative">
              {/* Save */}
              <div
                ref={saveRef}
                className={`flex items-center justify-center gap-1 h-6 md:h-8 px-2.5 md:px-4 rounded-md text-[8px] md:text-xs font-semibold transition-all duration-300 cursor-default select-none ${
                  saveState === "clicking" ? "bg-[#B5581A] text-white scale-[0.92]"
                  : saveState === "saving" ? "bg-[#B5581A] text-white"
                  : saveState === "saved" ? "bg-green-600 text-white"
                  : saveState === "hover" ? "bg-[#B5581A] text-white shadow-sm"
                  : "bg-[#F4E0D0]/70 text-[#B5581A] border border-[#B5581A]/30"
                }`}
              >
                {saveState === "saving" ? (
                  <><div className="w-2 h-2 md:w-3 md:h-3 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" /><span>Saving…</span></>
                ) : saveState === "saved" ? (
                  <><svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg><span>Saved</span></>
                ) : (
                  <span>Save Changes</span>
                )}
              </div>

              {/* Add Offer */}
              <div
                ref={offerRef}
                className={`flex items-center justify-center gap-1 h-6 md:h-8 px-2.5 md:px-4 rounded-md text-[8px] md:text-xs font-medium transition-all duration-300 border cursor-default select-none ${
                  offerState === "clicking" || showDialog ? "border-[#B5581A] bg-[#F4E0D0] text-[#B5581A] scale-[0.92]"
                  : offerState === "adding" ? "border-[#B5581A] bg-[#F4E0D0]/50 text-[#B5581A]"
                  : offerState === "added" ? "border-green-500 bg-green-50 text-green-700"
                  : offerState === "hover" ? "border-[#B5581A]/50 bg-[#F4E0D0]/30 text-[#B5581A]"
                  : "border-stone-200 text-stone-600 bg-white"
                }`}
              >
                {offerState === "adding" ? (
                  <><div className="w-2 h-2 md:w-3 md:h-3 border-[1.5px] border-[#B5581A] border-t-transparent rounded-full animate-spin" /><span>Applying…</span></>
                ) : offerState === "added" ? (
                  <><svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg><span>Offer Added</span></>
                ) : (
                  <><svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg><span>Add Offer</span></>
                )}
              </div>

              {/* ── Offer Dialog Popup ── */}
              <div
                className={`absolute bottom-full left-0 mb-2 md:mb-3 w-[180px] md:w-[240px] bg-white rounded-lg border border-stone-200 shadow-xl transition-all duration-300 origin-bottom-left z-20 ${
                  showDialog ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="flex items-center justify-between px-2.5 md:px-4 pt-2.5 md:pt-3.5 pb-1.5 md:pb-2">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-[#B5581A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-[8px] md:text-xs font-semibold text-stone-800">Add Offer</span>
                  </div>
                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="px-2.5 md:px-4 pb-2.5 md:pb-3.5">
                  <label className="text-[7px] md:text-[10px] font-medium text-stone-500 mb-0.5 md:mb-1 block">Discount Percentage</label>
                  <div className={`h-5 md:h-8 rounded-md border px-2 md:px-2.5 flex items-center gap-0.5 text-[9px] md:text-sm mb-2 md:mb-3 transition-all duration-200 ${
                    phase === "dialog-typing" ? "border-[#B5581A]/50 ring-2 ring-[#B5581A]/10 bg-white" : "border-stone-200 bg-stone-50"
                  }`}>
                    <span className="text-stone-900 font-medium">{discountTyped}</span>
                    {phase === "dialog-typing" && <span className="inline-block w-px h-2.5 md:h-3.5 bg-stone-800 animate-pulse" />}
                    {!discountTyped && phase !== "dialog-typing" && <span className="text-stone-400">e.g. 30</span>}
                    <span className="ml-auto text-stone-400 text-[8px] md:text-xs">%</span>
                  </div>
                  {discountTyped && (
                    <div className="flex items-center justify-between text-[7px] md:text-[10px] text-stone-500 mb-2 md:mb-3 px-0.5 animate-[fadeSlideIn_0.3s_ease-out]">
                      <span>$18.00</span>
                      <span className="text-stone-300">→</span>
                      <span className="font-semibold text-[#B5581A]">$12.60</span>
                    </div>
                  )}
                  <div
                    ref={applyRef}
                    className={`flex items-center justify-center gap-1 h-5 md:h-7 rounded-md text-[7px] md:text-[11px] font-semibold transition-all duration-200 cursor-default select-none ${
                      applyState === "clicking" ? "bg-[#B5581A] text-white scale-[0.92]"
                      : applyState === "hover" ? "bg-[#B5581A] text-white shadow-sm"
                      : "bg-[#F4E0D0]/70 text-[#B5581A] border border-[#B5581A]/30"
                    }`}
                  >
                    <span>Apply 30% Off</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="w-px bg-stone-100" />

          {/* ── Menu Preview Panel (Compact style) ── */}
          <div className="w-[38%] md:w-[38%] bg-white flex flex-col overflow-hidden">
            {/* Preview header */}
            <div className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 border-b border-stone-100 bg-stone-50/50">
              <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-[8px] md:text-[11px] font-medium text-stone-500">Live Preview</span>
              <span className="ml-auto w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            {/* Compact menu preview */}
            <MenuPreview typedText={typedText} showOfferBadge={showOfferBadge} />
          </div>
        </div>
      </div>

      {/* Cursor overlay */}
      <AnimCursor
        x={cursorPos.x}
        y={cursorPos.y}
        clicking={cursorClicking}
        visible={cursorVisible}
        duration={cursorDuration}
      />

      {/* Glow effect */}
      <div className="absolute -inset-6 -z-10 bg-gradient-to-b from-[#F4E0D0]/15 via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />
    </div>
  );
}

/* ── Main Component ── */
export default function DashboardAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6">
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <DashboardAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}
