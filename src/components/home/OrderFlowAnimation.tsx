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
        <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-orange-600/20 animate-ping" />
      )}
    </div>
  );
}

/* ── Dashboard Sidebar Icons ── */
function DashSidebarIcons({ activeIndex }: { activeIndex: number }) {
  const icons = [
    <svg key="0" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5" /><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5" /><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5" /><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5" /></svg>,
    <svg key="1" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    <svg key="2" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>,
    <svg key="3" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    <svg key="4" className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeWidth="1.5" /></svg>,
  ];
  return (
    <>
      {icons.map((icon, i) => (
        <div
          key={i}
          className={`flex items-center justify-center w-full py-2 md:py-2.5 transition-colors ${
            i === activeIndex ? "text-orange-600 bg-orange-100/50" : "text-stone-400"
          }`}
        >
          {icon}
        </div>
      ))}
    </>
  );
}

/* ── Phase Types ── */
type Phase =
  | "phone-enter" | "idle-1"
  // Item 1 bottom sheet
  | "move-card-1" | "click-card-1" | "sheet1-open"
  | "move-add-1" | "click-add-1" | "added-1"
  | "move-plus-1" | "click-plus-1" | "qty2-1"
  | "move-done-1" | "click-done-1" | "sheet1-close"
  // Item 2 bottom sheet
  | "move-card-2" | "click-card-2" | "sheet2-open"
  | "move-add-2" | "click-add-2" | "added-2"
  | "move-done-2" | "click-done-2" | "sheet2-close"
  // Place order
  | "cart-show" | "move-place" | "click-place" | "order-placed" | "order-sent"
  // Step text screens (with flying icon overlay)
  | "step-text-1" | "step-text-2" | "step-text-3"
  // Desktop
  | "trans-1" | "desktop-enter" | "order-arrive"
  | "move-accept" | "click-accept" | "accepted" | "assigned"
  // Delivery
  | "trans-2" | "delivery-enter" | "notif-show" | "hold";

/* ── Phone Frame Wrapper ── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[130px] md:w-[190px] pb-4 md:pb-0">
      <div className="relative bg-stone-900 rounded-[22px] md:rounded-[28px] p-[4px] md:p-[5px] shadow-xl shadow-stone-900/20">
        {/* Dynamic Island */}
        <div className="absolute top-[6px] md:top-[7px] left-1/2 -translate-x-1/2 w-[38px] md:w-[50px] h-[11px] md:h-[14px] bg-stone-950 rounded-full z-20" />
        {/* Screen */}
        <div className="relative isolate bg-[#F9F8F5] rounded-[19px] md:rounded-[24px] overflow-hidden h-[250px] md:h-[330px]">
          {/* Top padding for dynamic island */}
          <div className="h-4 md:h-5" />
          {children}
        </div>
        {/* Home indicator */}
        <div className="flex justify-center py-[2px] md:py-[3px]">
          <div className="w-[36px] md:w-[48px] h-[2.5px] bg-stone-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Inner Animation ── */
function OrderFlowInner({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("phone-enter");
  const containerRef = useRef<HTMLDivElement>(null);
  const addBtn1Ref = useRef<HTMLDivElement>(null);
  const addBtn2Ref = useRef<HTMLDivElement>(null);
  const sheetAddRef = useRef<HTMLDivElement>(null);
  const sheetPlusRef = useRef<HTMLDivElement>(null);
  const sheetDoneRef = useRef<HTMLDivElement>(null);
  const placeOrderRef = useRef<HTMLDivElement>(null);
  const acceptRef = useRef<HTMLDivElement>(null);
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

  /* ── Phase timeline ── */
  useEffect(() => {
    const t: NodeJS.Timeout[] = [];

    setPhase("phone-enter");
    setCursorPos({ x: -30, y: -30 });

    // Scene 1: Customer orders on phone
    t.push(setTimeout(() => setPhase("idle-1"), 400));

    // Item 1: open sheet, add qty 2, done
    t.push(setTimeout(() => { setCursorPos(getCenter(addBtn1Ref)); setPhase("move-card-1"); }, 1000));
    t.push(setTimeout(() => setPhase("click-card-1"), 1600));
    t.push(setTimeout(() => setPhase("sheet1-open"), 1800));
    t.push(setTimeout(() => { setCursorPos(getCenter(sheetAddRef)); setPhase("move-add-1"); }, 2400));
    t.push(setTimeout(() => setPhase("click-add-1"), 2900));
    t.push(setTimeout(() => setPhase("added-1"), 3100));
    t.push(setTimeout(() => { setCursorPos(getCenter(sheetPlusRef)); setPhase("move-plus-1"); }, 3500));
    t.push(setTimeout(() => setPhase("click-plus-1"), 3900));
    t.push(setTimeout(() => setPhase("qty2-1"), 4100));
    t.push(setTimeout(() => { setCursorPos(getCenter(sheetDoneRef)); setPhase("move-done-1"); }, 4400));
    t.push(setTimeout(() => setPhase("click-done-1"), 4700));
    t.push(setTimeout(() => setPhase("sheet1-close"), 4900));

    // Item 2: open sheet, add qty 1, done
    t.push(setTimeout(() => { setCursorPos(getCenter(addBtn2Ref)); setPhase("move-card-2"); }, 5300));
    t.push(setTimeout(() => setPhase("click-card-2"), 5800));
    t.push(setTimeout(() => setPhase("sheet2-open"), 6000));
    t.push(setTimeout(() => { setCursorPos(getCenter(sheetAddRef)); setPhase("move-add-2"); }, 6500));
    t.push(setTimeout(() => setPhase("click-add-2"), 7000));
    t.push(setTimeout(() => setPhase("added-2"), 7200));
    t.push(setTimeout(() => { setCursorPos(getCenter(sheetDoneRef)); setPhase("move-done-2"); }, 7500));
    t.push(setTimeout(() => setPhase("click-done-2"), 7800));
    t.push(setTimeout(() => setPhase("sheet2-close"), 8000));

    // Place order
    t.push(setTimeout(() => setPhase("cart-show"), 8400));
    t.push(setTimeout(() => { setCursorPos(getCenter(placeOrderRef)); setPhase("move-place"); }, 8800));
    t.push(setTimeout(() => setPhase("click-place"), 9300));
    t.push(setTimeout(() => setPhase("order-placed"), 9500));
    t.push(setTimeout(() => setPhase("order-sent"), 10300));

    // Step text 1 + flying icon → Dashboard
    t.push(setTimeout(() => setPhase("step-text-1"), 11100));
    t.push(setTimeout(() => setPhase("trans-1"), 13300));
    t.push(setTimeout(() => setPhase("desktop-enter"), 14000));

    // Scene 2: Dashboard receives order
    t.push(setTimeout(() => setPhase("order-arrive"), 14500));
    t.push(setTimeout(() => { setCursorPos(getCenter(acceptRef)); setPhase("move-accept"); }, 15300));
    t.push(setTimeout(() => setPhase("click-accept"), 15900));
    t.push(setTimeout(() => setPhase("accepted"), 16100));
    t.push(setTimeout(() => setPhase("assigned"), 16900));

    // Step text 2 + flying icon → Delivery
    t.push(setTimeout(() => setPhase("step-text-2"), 17700));
    t.push(setTimeout(() => setPhase("trans-2"), 19900));
    t.push(setTimeout(() => setPhase("delivery-enter"), 20600));

    // Scene 3: Delivery boy notification
    t.push(setTimeout(() => setPhase("notif-show"), 21000));
    t.push(setTimeout(() => setPhase("hold"), 22000));

    // Step text 3 + flying icon → Done
    t.push(setTimeout(() => setPhase("step-text-3"), 22800));
    t.push(setTimeout(onComplete, 25000));

    return () => t.forEach(clearTimeout);
  }, [onComplete, getCenter]);

  /* ── Derived states ── */

  // Scene visibility
  const phoneOn = !["step-text-1","trans-1","desktop-enter","order-arrive","move-accept","click-accept","accepted","assigned","step-text-2","trans-2","delivery-enter","notif-show","hold","step-text-3"].includes(phase);
  const text1On = phase === "step-text-1";
  const desktopOn = ["trans-1","desktop-enter","order-arrive","move-accept","click-accept","accepted","assigned"].includes(phase);
  const text2On = phase === "step-text-2";
  const deliveryOn = ["trans-2","delivery-enter","notif-show","hold"].includes(phase);
  const text3On = phase === "step-text-3";

  // Scene order index for left-to-right slide
  const activeScene = text3On ? 5 : deliveryOn ? 4 : text2On ? 3 : desktopOn ? 2 : text1On ? 1 : 0;
  const slideStyle = (myIdx: number, isOn: boolean) => ({
    gridRow: 1,
    gridColumn: 1,
    opacity: isOn ? 1 : 0,
    transform: isOn ? "translateX(0)" : myIdx < activeScene ? "translateX(-60px)" : "translateX(60px)",
    pointerEvents: "none" as const,
  });


  // Bottom sheet
  const sheet1Phases = ["sheet1-open","move-add-1","click-add-1","added-1","move-plus-1","click-plus-1","qty2-1","move-done-1","click-done-1"];
  const sheet2Phases = ["sheet2-open","move-add-2","click-add-2","added-2","move-done-2","click-done-2"];
  const sheetOpen = [...sheet1Phases, ...sheet2Phases].includes(phase);
  const sheetItem: 0 | 1 | 2 = sheet1Phases.includes(phase) ? 1 : sheet2Phases.includes(phase) ? 2 : 0;
  const sheetShowStepper = ["added-1","move-plus-1","click-plus-1","qty2-1","move-done-1","click-done-1","added-2","move-done-2","click-done-2"].includes(phase);
  const sheetQty = ["qty2-1","move-done-1","click-done-1"].includes(phase) ? 2 : 1;

  // Item quantities (card badges)
  const brisketQty =
    ["click-plus-1","qty2-1","move-done-1","click-done-1","sheet1-close",
     "move-card-2","click-card-2",...sheet2Phases,"sheet2-close",
     "cart-show","move-place","click-place","order-placed","order-sent"].includes(phase) ? 2
    : ["click-add-1","added-1","move-plus-1"].includes(phase) ? 1
    : 0;

  const burgerQty =
    ["click-add-2","added-2","move-done-2","click-done-2","sheet2-close",
     "cart-show","move-place","click-place","order-placed","order-sent"].includes(phase) ? 1
    : 0;

  // Cart
  const showCart = ["cart-show","move-place","click-place","order-placed","order-sent"].includes(phase);
  const totalItems = brisketQty + burgerQty;
  const totalPrice = brisketQty * 18 + burgerQty * 14;

  // Place order button
  const placeClicking = phase === "click-place";
  const placeDone = phase === "order-placed" || phase === "order-sent";

  // Desktop
  const showNewOrder = ["order-arrive","move-accept","click-accept","accepted","assigned"].includes(phase);
  const orderAccepted = phase === "accepted" || phase === "assigned";
  const clickingAccept = phase === "click-accept";

  // Delivery
  const showDeliveryNotif = phase === "notif-show" || phase === "hold";

  // Cursor
  const cursorVisible = [
    "move-card-1","click-card-1",
    "move-add-1","click-add-1","added-1",
    "move-plus-1","click-plus-1","qty2-1",
    "move-done-1","click-done-1",
    "move-card-2","click-card-2",
    "move-add-2","click-add-2","added-2",
    "move-done-2","click-done-2",
    "cart-show","move-place","click-place","order-placed",
    "move-accept","click-accept",
  ].includes(phase);

  const cursorClicking = [
    "click-card-1","click-add-1","click-plus-1","click-done-1",
    "click-card-2","click-add-2","click-done-2",
    "click-place","click-accept",
  ].includes(phase);

  const cursorDuration =
    ["move-card-1","move-add-1","move-card-2","move-add-2","move-place"].includes(phase) ? "700ms"
    : ["move-plus-1","move-done-1","move-done-2"].includes(phase) ? "400ms"
    : cursorClicking ? "150ms"
    : "0ms";

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <div className="grid">
        {/* ═══════════════════════════════════════════
            Scene 1: Customer Phone — Restaurant Menu
            ═══════════════════════════════════════════ */}
        <div
          className="flex items-center justify-center transition-all duration-700 ease-in-out"
          style={slideStyle(0, phoneOn)}
        >
          <div>
            <PhoneFrame>
              {/* ── Banner (matches Sidebar.tsx banner section) ── */}
              <div className="w-full h-[60px] md:h-[80px] relative overflow-hidden">
                <img
                  src="/dashboard/store-banner.jpg"
                  alt="Oakwood Grill"
                  className="w-full h-full object-cover"
                />
                {/* Gradient fade at bottom of banner */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-6"
                  style={{ background: "linear-gradient(to top, #F9F8F5, transparent)" }}
                />
                {/* Social icons — top-right */}
                <div className="absolute top-1 right-1 md:top-1.5 md:right-1.5 flex flex-col gap-0.5 md:gap-1 z-20">
                  {[
                    /* Phone */ "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
                    /* WhatsApp circle placeholder */ "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
                    /* Location */ "M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
                  ].map((d, i) => (
                    <div key={i} className="w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
                      <svg className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Store info + search (matches Sidebar.tsx store info section) ── */}
              <div
                className="flex items-start justify-between px-2 md:px-2.5 pb-1 md:pb-1.5 -mt-1 relative z-10"
                style={{ borderBottom: "1px solid #e7e5e4" }}
              >
                <div>
                  <p className="text-[8px] md:text-[10px] font-bold text-stone-900 tracking-tight">
                    Oakwood Grill
                  </p>
                  <div className="flex items-center gap-0.5 opacity-60">
                    <svg className="w-1.5 h-1.5 md:w-2 md:h-2 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[5px] md:text-[7px] text-stone-500">Brooklyn, New York</span>
                  </div>
                </div>
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center bg-stone-100 flex-shrink-0">
                  <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-stone-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* ── Main: Category sidebar + Items grid (matches Sidebar.tsx) ── */}
              <div className="flex flex-1 min-h-0">
                {/* Left category sidebar — 80px in real app, scaled to ~30/38px */}
                <div className="flex flex-col items-center pt-1 md:pt-1.5 w-[30px] md:w-[38px] flex-shrink-0 overflow-hidden" style={{ backgroundColor: "#F9F8F5" }}>
                  {[
                    { img: "/dashboard/brisket.webp", name: "Entrees", active: true },
                    { img: "/dashboard/burger.webp", name: "Burgers", active: false },
                    { img: "/dashboard/salmon.webp", name: "Seafood", active: false },
                  ].map((cat, i) => (
                    <div key={i} className="w-full flex flex-col items-center gap-[2px] py-1 md:py-1.5 relative">
                      {/* Active indicator bar — left edge */}
                      {cat.active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 md:h-5 rounded-r-full bg-orange-600" />
                      )}
                      <div
                        className="w-5 h-5 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0 transition-all"
                        style={{
                          border: cat.active ? "1.5px solid #EA580C" : "1.5px solid transparent",
                          boxShadow: cat.active ? "0 2px 6px rgba(234,88,12,0.3)" : "0 0.5px 2px rgba(0,0,0,0.06)",
                        }}
                      >
                        <img src={cat.img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span
                        className="text-[4px] md:text-[5px] text-center leading-tight line-clamp-2 max-w-[28px] md:max-w-[34px]"
                        style={{
                          color: cat.active ? "#EA580C" : "#a8a29e",
                          fontWeight: cat.active ? 700 : 500,
                        }}
                      >
                        {cat.name}
                      </span>
                    </div>
                  ))}
                  {/* All category */}
                  <div className="w-full flex flex-col items-center gap-[2px] py-1 md:py-1.5 relative">
                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center bg-orange-50">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-orange-600/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <span className="text-[4px] md:text-[5px] text-center leading-tight text-stone-400 font-medium">All</span>
                  </div>
                </div>

                {/* Thin divider */}
                <div className="w-px self-stretch bg-stone-200" />

                {/* Items grid area */}
                <div className="flex-1 min-w-0" style={{ backgroundColor: "#F9F8F5" }}>
                  {/* Category header */}
                  <div className="flex items-baseline justify-between px-1.5 md:px-2 pt-1.5 md:pt-2 pb-0.5 md:pb-1">
                    <p className="text-[7px] md:text-[9px] font-bold text-stone-900 tracking-tight">Entrees</p>
                    <div className="flex items-center gap-px text-[4px] md:text-[5px] text-stone-400 font-medium">
                      <span>&lt;</span><span>Swipe</span><span>&gt;</span>
                    </div>
                  </div>

                  {/* Items in grid-cols-2 (scaled from real grid-cols-3) */}
                  <div className="grid grid-cols-2 gap-1 md:gap-1.5 px-1 md:px-1.5 pb-14">
                    {/* Item 1: Smoked BBQ Brisket */}
                    <div className="rounded-lg overflow-visible relative" style={{ backgroundColor: "rgba(28,25,23,0.06)", border: "1px solid #e7e5e4" }}>
                      {/* Cart badge */}
                      {brisketQty > 0 && (
                        <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center text-white text-[6px] md:text-[7px] font-bold shadow-md z-10 bg-orange-600">
                          {brisketQty}
                        </div>
                      )}
                      <div className="relative overflow-hidden rounded-t-lg" ref={addBtn1Ref}>
                        <div className="w-full aspect-square overflow-hidden">
                          <img src="/dashboard/brisket.webp" alt="" className="w-full h-full object-cover" />
                        </div>
                        {/* Veg/Non-veg indicator — top-right of image */}
                        <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-2 h-2 md:w-2.5 md:h-2.5 border-[1px] border-red-600 rounded-[1.5px] flex items-center justify-center bg-white/90">
                          <div className="w-[3px] h-[3px] md:w-1 md:h-1 bg-red-600 rounded-full" />
                        </div>
                      </div>
                      <div className="px-1 md:px-1.5 py-0.5 md:py-1">
                        <p className="font-medium text-[5px] md:text-[7px] capitalize line-clamp-2 leading-tight text-stone-900">Smoked BBQ Brisket</p>
                        <p className="font-bold text-[6px] md:text-[7px] mt-px text-orange-600">$18</p>
                      </div>
                    </div>

                    {/* Item 2: Classic Cheeseburger */}
                    <div className="rounded-lg overflow-visible relative" style={{ backgroundColor: "rgba(28,25,23,0.06)", border: "1px solid #e7e5e4" }}>
                      {burgerQty > 0 && (
                        <div className="absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center text-white text-[6px] md:text-[7px] font-bold shadow-md z-10 bg-orange-600">
                          {burgerQty}
                        </div>
                      )}
                      <div className="relative overflow-hidden rounded-t-lg" ref={addBtn2Ref}>
                        <div className="w-full aspect-square overflow-hidden">
                          <img src="/dashboard/burger.webp" alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-2 h-2 md:w-2.5 md:h-2.5 border-[1px] border-red-600 rounded-[1.5px] flex items-center justify-center bg-white/90">
                          <div className="w-[3px] h-[3px] md:w-1 md:h-1 bg-red-600 rounded-full" />
                        </div>
                      </div>
                      <div className="px-1 md:px-1.5 py-0.5 md:py-1">
                        <p className="font-medium text-[5px] md:text-[7px] capitalize line-clamp-2 leading-tight text-stone-900">Classic Cheeseburger</p>
                        <p className="font-bold text-[6px] md:text-[7px] mt-px text-orange-600">$14</p>
                      </div>
                    </div>

                    {/* Item 3: Grilled Salmon */}
                    <div className="rounded-lg overflow-visible relative" style={{ backgroundColor: "rgba(28,25,23,0.06)", border: "1px solid #e7e5e4" }}>
                      <div className="relative overflow-hidden rounded-t-lg">
                        <div className="w-full aspect-square overflow-hidden">
                          <img src="/dashboard/salmon.webp" alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-2 h-2 md:w-2.5 md:h-2.5 border-[1px] border-green-600 rounded-[1.5px] flex items-center justify-center bg-white/90">
                          <div className="w-[3px] h-[3px] md:w-1 md:h-1 bg-green-600 rounded-full" />
                        </div>
                      </div>
                      <div className="px-1 md:px-1.5 py-0.5 md:py-1">
                        <p className="font-medium text-[5px] md:text-[7px] capitalize line-clamp-2 leading-tight text-stone-900">Grilled Salmon</p>
                        <p className="font-bold text-[6px] md:text-[7px] mt-px text-orange-600">$22</p>
                      </div>
                    </div>

                    {/* Item 4: Partial (visual depth) */}
                    <div className="rounded-lg overflow-visible relative opacity-40" style={{ backgroundColor: "rgba(28,25,23,0.06)", border: "1px solid #e7e5e4" }}>
                      <div className="relative overflow-hidden rounded-t-lg">
                        <div className="w-full aspect-square overflow-hidden">
                          <img src="/dashboard/brisket.webp" alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-2 h-2 md:w-2.5 md:h-2.5 border-[1px] border-red-600 rounded-[1.5px] flex items-center justify-center bg-white/90">
                          <div className="w-[3px] h-[3px] md:w-1 md:h-1 bg-red-600 rounded-full" />
                        </div>
                      </div>
                      <div className="px-1 md:px-1.5 py-0.5 md:py-1">
                        <p className="font-medium text-[5px] md:text-[7px] capitalize line-clamp-2 leading-tight text-stone-900">Texas Ribs</p>
                        <p className="font-bold text-[6px] md:text-[7px] mt-px text-orange-600">$24</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Bottom sheet (matches SidebarItemCard drawer) ── */}
              <div
                className="absolute inset-0 bg-black/40 z-20 transition-opacity duration-300 pointer-events-none"
                style={{ opacity: sheetOpen ? 1 : 0 }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 z-30 transition-all duration-400 ease-out"
                style={{ transform: sheetOpen ? "translateY(0)" : "translateY(100%)" }}
              >
                <div className="rounded-t-2xl md:rounded-t-3xl overflow-hidden" style={{ backgroundColor: "#F9F8F5" }}>
                  {/* Item image */}
                  <div className="w-full h-[50px] md:h-[70px] overflow-hidden">
                    <img
                      src={sheetItem === 2 ? "/dashboard/burger.webp" : "/dashboard/brisket.webp"}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info — matches SidebarItemCard drawer layout */}
                  <div className="px-2 md:px-3 pt-1.5 md:pt-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 md:w-2.5 md:h-2.5 border-[1px] border-red-600 rounded-[1.5px] flex items-center justify-center bg-white flex-shrink-0">
                            <div className="w-[3px] h-[3px] md:w-1 md:h-1 bg-red-600 rounded-full" />
                          </div>
                          <p className="text-[7px] md:text-[9px] font-bold capitalize leading-tight">
                            {sheetItem === 2 ? "Classic Cheeseburger" : "Smoked BBQ Brisket"}
                          </p>
                        </div>
                        <p className="text-[5px] md:text-[7px] opacity-70 mt-0.5 line-clamp-2">
                          {sheetItem === 2 ? "Angus beef patty, cheddar, brioche bun" : "Slow-smoked 12hr Texas-style brisket"}
                        </p>
                      </div>
                      <p className="text-[9px] md:text-[11px] font-bold text-orange-600 flex-shrink-0">
                        {sheetItem === 2 ? "$14" : "$18"}
                      </p>
                    </div>
                  </div>

                  {/* Bottom bar — ADD TO CART or stepper + Done */}
                  <div className="px-2 md:px-3 pb-2 md:pb-2.5 pt-1.5 md:pt-2" style={{ borderTop: "1px solid #e7e5e4" }}>
                    {sheetShowStepper ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-orange-600 rounded-lg overflow-hidden text-white">
                          <span className="px-1.5 md:px-2 py-0.5 md:py-1 text-[7px] md:text-[9px]">−</span>
                          <span className="px-1 md:px-1.5 text-[8px] md:text-[10px] font-bold min-w-[10px] md:min-w-[14px] text-center">
                            {sheetQty}
                          </span>
                          <div
                            ref={sheetPlusRef}
                            className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[7px] md:text-[9px] transition-transform duration-150 ${
                              phase === "click-plus-1" ? "scale-75" : ""
                            }`}
                          >
                            +
                          </div>
                        </div>
                        <div
                          ref={sheetDoneRef}
                          className={`bg-orange-600 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-[6px] md:text-[8px] font-bold tracking-wide transition-transform duration-150 ${
                            phase === "click-done-1" || phase === "click-done-2" ? "scale-90" : ""
                          }`}
                        >
                          Done
                        </div>
                      </div>
                    ) : (
                      <div
                        ref={sheetAddRef}
                        className={`w-full bg-orange-600 text-white text-center py-1 md:py-1.5 rounded-lg text-[6px] md:text-[8px] font-bold tracking-wide transition-transform duration-150 ${
                          phase === "click-add-1" || phase === "click-add-2" ? "scale-95" : ""
                        }`}
                      >
                        ADD TO CART
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Cart bar — slides up from bottom ── */}
              <div
                className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-500 ease-out"
                style={{
                  transform: showCart ? "translateY(0)" : "translateY(100%)",
                  opacity: showCart ? 1 : 0,
                }}
              >
                <div
                  className={`mx-2 md:mx-2.5 mb-2 md:mb-3 rounded-xl px-2 md:px-2.5 py-1.5 md:py-2 flex items-center justify-between shadow-lg transition-colors duration-500 ${
                    placeDone ? "bg-green-500" : "bg-orange-600"
                  }`}
                >
                  <div>
                    <p className="text-[5px] md:text-[7px] text-white/80">{totalItems} items</p>
                    <p className="text-[7px] md:text-[9px] font-bold text-white">
                      ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                  <div
                    ref={placeOrderRef}
                    className={`px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-lg text-[6px] md:text-[8px] font-bold transition-all duration-300 ${
                      placeClicking
                        ? "bg-white text-orange-600 scale-90"
                        : placeDone
                          ? "bg-white text-green-600"
                          : "bg-white text-orange-600"
                    }`}
                  >
                    {placeDone ? "✓ Order Placed!" : "Place Order →"}
                  </div>
                </div>
              </div>

              {/* Order sent overlay */}
              {phase === "order-sent" && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[19px] md:rounded-[24px] flex items-center justify-center z-20 animate-[orderSentFade_0.3s_ease-out]">
                  <div className="text-center">
                    <div className="w-8 h-8 md:w-10 md:h-10 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-1.5 animate-[orderSentScale_0.4s_ease-out]">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-[8px] md:text-[10px] font-bold text-stone-800">Order Sent!</p>
                    <p className="text-[6px] md:text-[8px] text-stone-500">Heading to restaurant</p>
                  </div>
                </div>
              )}
            </PhoneFrame>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Scene 2: Desktop — Petpooja Dashboard
            ═══════════════════════════════════════════ */}
        <div
          className="flex items-center transition-all duration-700 ease-in-out"
          style={slideStyle(2, desktopOn)}
        >
          <div className="w-full">
            <div
              className="relative w-full rounded-md md:rounded-lg border border-stone-200/80 bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] overflow-hidden"
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
                  Petpooja Dashboard
                </span>
                {/* Notification bell */}
                <div className="ml-auto relative">
                  <svg className="w-3 h-3 md:w-4 md:h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {showNewOrder && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex min-h-[260px] md:min-h-[360px]">
                {/* Sidebar — desktop only */}
                <div className="hidden md:flex flex-col w-[48px] border-r border-stone-100 bg-stone-50/30 pt-3 gap-0.5">
                  <DashSidebarIcons activeIndex={1} />
                </div>

                {/* Content */}
                <div className="flex-1 p-3 md:p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="text-[10px] md:text-sm font-semibold text-stone-800">Order Management</h3>
                    </div>
                    <div className="text-[7px] md:text-[10px] text-stone-500 bg-stone-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                      Active: <span className="font-bold text-orange-600">{showNewOrder ? 3 : 2}</span>
                    </div>
                  </div>

                  {/* Existing orders (muted) */}
                  <div className="space-y-1.5 md:space-y-2 mb-2 md:mb-3">
                    <div className="flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2 bg-stone-50 rounded-md md:rounded-lg border border-stone-100 opacity-50">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-[7px] md:text-[10px] font-semibold text-stone-600">#1245</span>
                        <span className="text-[6px] md:text-[9px] text-stone-400">John D. · 2 items</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-[7px] md:text-[10px] font-semibold text-stone-600">$28.00</span>
                        <span className="text-[6px] md:text-[8px] bg-green-100 text-green-700 px-1 md:px-1.5 py-0.5 rounded font-medium">
                          Delivered
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2 bg-stone-50 rounded-md md:rounded-lg border border-stone-100 opacity-50">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-[7px] md:text-[10px] font-semibold text-stone-600">#1246</span>
                        <span className="text-[6px] md:text-[9px] text-stone-400">Sarah M. · 1 item</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-[7px] md:text-[10px] font-semibold text-stone-600">$22.00</span>
                        <span className="text-[6px] md:text-[8px] bg-yellow-100 text-yellow-700 px-1 md:px-1.5 py-0.5 rounded font-medium">
                          Preparing
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* New Order — slides in */}
                  <div
                    className="transition-all duration-500 ease-out"
                    style={{
                      opacity: showNewOrder ? 1 : 0,
                      transform: showNewOrder ? "translateY(0)" : "translateY(12px)",
                    }}
                  >
                    <div
                      className={`border rounded-lg md:rounded-xl p-2.5 md:p-3.5 transition-all duration-500 ${
                        orderAccepted
                          ? "border-green-200 bg-green-50/50"
                          : "border-orange-200 bg-orange-50/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 md:mb-1.5">
                        <div className="flex items-center gap-1 md:gap-1.5">
                          <span className="text-[8px] md:text-xs font-bold text-stone-800">#ORD-1247</span>
                          <span
                            className={`text-[6px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded font-semibold transition-colors duration-300 ${
                              orderAccepted
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-600 animate-pulse"
                            }`}
                          >
                            {orderAccepted ? "Accepted" : "New Order"}
                          </span>
                        </div>
                        <span className="text-[6px] md:text-[9px] text-stone-400">Just now</span>
                      </div>
                      <p className="text-[7px] md:text-[10px] text-stone-600 mb-1.5 md:mb-2">
                        Smoked BBQ Brisket ×2, Classic Cheeseburger ×1
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] md:text-[11px] font-bold text-stone-800">$50.00</span>
                        <div className="flex gap-1 md:gap-1.5">
                          <div
                            ref={acceptRef}
                            className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[7px] md:text-[10px] font-semibold transition-all duration-300 select-none ${
                              clickingAccept
                                ? "bg-orange-700 text-white scale-[0.92]"
                                : orderAccepted
                                  ? "bg-green-500 text-white"
                                  : "bg-orange-600 text-white"
                            }`}
                          >
                            {orderAccepted ? (
                              <span className="flex items-center gap-0.5">
                                <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                Accepted
                              </span>
                            ) : (
                              "Accept"
                            )}
                          </div>
                          {!orderAccepted && (
                            <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[7px] md:text-[10px] font-medium border border-stone-200 text-stone-500 select-none">
                              Reject
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assigning delivery indicator */}
                  {phase === "assigned" && (
                    <div className="mt-2 md:mt-3 flex items-center gap-1.5 text-[7px] md:text-[10px] text-stone-500 animate-[orderSentFade_0.3s_ease-out]">
                      <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-[1.5px] border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span>Assigning delivery partner...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Scene 3: Delivery Boy Phone
            ═══════════════════════════════════════════ */}
        <div
          className="flex items-center justify-center transition-all duration-700 ease-in-out"
          style={slideStyle(4, deliveryOn)}
        >
          <div>
            <PhoneFrame>
              {/* App Header */}
              <div className="px-2.5 md:px-3 py-1.5 md:py-2 bg-white border-b border-stone-100">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 md:w-5 md:h-5 bg-orange-600 rounded-md flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                    </svg>
                  </div>
                  <span className="text-[7px] md:text-[10px] font-bold text-stone-800">Delivery Partner</span>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500" />
                    <span className="text-[5px] md:text-[7px] text-green-600 font-medium">Online</span>
                  </div>
                </div>
              </div>

              {/* Status section */}
              <div className="px-2.5 md:px-3 py-2 md:py-2.5">
                <p className="text-[6px] md:text-[8px] text-stone-400 font-medium uppercase tracking-wider">
                  Active Delivery
                </p>
              </div>

              {/* Order Card */}
              <div className="mx-2 md:mx-2.5 bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="px-2 md:px-2.5 py-1.5 md:py-2 border-b border-stone-50 bg-orange-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] md:text-[9px] font-bold text-stone-800">#ORD-1247</span>
                    <span className="text-[5px] md:text-[7px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-semibold">
                      Accepted
                    </span>
                  </div>
                </div>
                <div className="px-2 md:px-2.5 py-1.5 md:py-2 space-y-1 md:space-y-1.5">
                  <div className="flex items-center gap-1">
                    <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-[6px] md:text-[8px] text-stone-600">Oakwood Grill, Brooklyn</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-[6px] md:text-[8px] text-stone-600">3 items · $50.00</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-[6px] md:text-[8px] text-stone-600">Customer: Alex B.</p>
                  </div>
                </div>
                <div className="px-2 md:px-2.5 py-1.5 md:py-2 border-t border-stone-50 flex gap-1">
                  <div className="flex-1 bg-orange-600 text-white text-center py-1 md:py-1.5 rounded-lg text-[6px] md:text-[8px] font-bold">
                    Navigate
                  </div>
                  <div className="flex-1 border border-stone-200 text-stone-600 text-center py-1 md:py-1.5 rounded-lg text-[6px] md:text-[8px] font-medium">
                    Call
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="mx-2 md:mx-2.5 mt-2 md:mt-2.5 rounded-xl overflow-hidden h-[55px] md:h-[80px] bg-gradient-to-br from-green-50 via-blue-50 to-green-100 relative border border-stone-100">
                {/* Road lines */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-[25%] left-[10%] w-[80%] h-[1.5px] bg-stone-400 rounded" />
                  <div className="absolute top-[55%] left-[5%] w-[90%] h-[1.5px] bg-stone-400 rounded" />
                  <div className="absolute top-[85%] left-[15%] w-[70%] h-[1.5px] bg-stone-400 rounded" />
                  <div className="absolute top-[5%] left-[30%] w-[1.5px] h-[90%] bg-stone-400 rounded" />
                  <div className="absolute top-[8%] left-[65%] w-[1.5px] h-[85%] bg-stone-400 rounded" />
                </div>
                {/* Pickup pin */}
                <div className="absolute top-[30%] left-[28%]">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-orange-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </div>
                {/* Dotted route */}
                <div className="absolute top-[36%] left-[36%] w-[28%] h-0 border-t-2 border-dashed border-orange-400/60" />
                {/* Delivery pin */}
                <div className="absolute top-[30%] right-[26%]">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </div>
              </div>

              {/* Push notification overlay — slides down from top */}
              <div
                className="absolute top-6 md:top-7 left-1.5 right-1.5 z-30 transition-all duration-500 ease-out"
                style={{
                  transform: showDeliveryNotif ? "translateY(0)" : "translateY(-120%)",
                  opacity: showDeliveryNotif ? 1 : 0,
                }}
              >
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-stone-200/80 p-2 md:p-2.5">
                  <div className="flex items-start gap-1.5">
                    <div className="w-5 h-5 md:w-6 md:h-6 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[7px] md:text-[9px] font-bold text-stone-900">New Delivery Order!</p>
                      <p className="text-[5px] md:text-[7px] text-stone-500 mt-0.5">
                        Oakwood Grill → Alex B.
                      </p>
                      <p className="text-[5px] md:text-[7px] text-stone-400">3 items · $50.00</p>
                    </div>
                  </div>
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>
        {/* ═══════════════════════════════════════════
            Step Text 1: Phone → Dashboard
            ═══════════════════════════════════════════ */}
        <div
          className="flex items-center justify-center transition-all duration-700 ease-in-out"
          style={slideStyle(1, text1On)}
        >
          <div className="text-center px-6 py-16 md:py-24">
            <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base md:text-xl font-semibold text-stone-800 leading-snug">
              Order is received instantly<br />in your dashboard
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Step Text 2: Dashboard → Delivery
            ═══════════════════════════════════════════ */}
        <div
          className="flex items-center justify-center transition-all duration-700 ease-in-out"
          style={slideStyle(3, text2On)}
        >
          <div className="text-center px-6 py-16 md:py-24">
            <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base md:text-xl font-semibold text-stone-800 leading-snug">
              Assigned order notification is<br />received in delivery boy&apos;s app
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            Step Text 3: Order Delivered
            ═══════════════════════════════════════════ */}
        <div
          className="flex items-center justify-center transition-all duration-700 ease-in-out"
          style={slideStyle(5, text3On)}
        >
          <div className="text-center px-6 py-16 md:py-24">
            <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base md:text-xl font-semibold text-stone-800 leading-snug">
              Order delivered<br />successfully!
            </p>
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
      <div className="absolute -inset-6 -z-10 bg-gradient-to-b from-orange-100/15 via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />
    </div>
  );
}

/* ── Main Component ── */
export default function OrderFlowAnimation() {
  const [cycle, setCycle] = useState(0);
  const handleComplete = useCallback(() => setCycle((c) => c + 1), []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6">
      <style jsx>{`
        @keyframes orderSentFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes orderSentScale {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      {/* Laptop screen */}
      <div className="relative">
        {/* Bezel */}
        <div className="bg-[#1c1c1e] rounded-t-xl md:rounded-t-2xl p-1.5 md:p-2 shadow-2xl shadow-stone-900/25">
          <div className="flex justify-center pb-1 md:pb-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3a3a3c]" />
          </div>
          <div className="bg-white rounded-md md:rounded-lg overflow-hidden">
            <OrderFlowInner
              key={cycle}
              onComplete={handleComplete}
            />
          </div>
        </div>
        {/* Base */}
        <div className="mx-[-2%] h-2.5 md:h-3.5 bg-gradient-to-b from-[#d4d4d8] to-[#a8a8ad] rounded-b-lg relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 md:w-20 h-0.5 md:h-[3px] rounded-b-sm bg-[#c8c8cc]" />
        </div>
        <div className="mt-1 mx-[5%] h-3 bg-black/[0.04] rounded-full blur-lg" />
      </div>
    </div>
  );
}
