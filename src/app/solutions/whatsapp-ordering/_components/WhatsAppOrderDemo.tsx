"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Instagram,
  Loader2,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Plus,
  Search,
  Tag,
} from "lucide-react";

/**
 * WhatsAppOrderDemo
 * ─────────────────
 * Self-contained, auto-playing phone mockup that tells the real product story:
 *
 *   send "Hi"  →  instant auto-login "Order Now" link  →  order on the visual
 *   web menu  →  live order-status updates back on WhatsApp.
 *
 * Pure HTML/CSS (no image assets) so it ships with the marketing bundle and
 * matches the home-page mockups. The timeline loops; the green "Order Now"
 * button is also tappable to jump straight to the menu view.
 */

type Phase = "chat" | "menu";

// Timeline of chat events. Each entry appears `at` ms after replay start.
const SCRIPT = [
  { at: 600, kind: "out", id: "hi" },
  { at: 1400, kind: "typing", id: "t1" },
  { at: 2600, kind: "welcome", id: "welcome" },
  // 4200ms → menu view auto-opens, then checkout → placing → placed
  { at: 9200, kind: "in", id: "placed" },
  { at: 10300, kind: "status", id: "accepted" },
  { at: 11200, kind: "status", id: "ready" },
  { at: 12100, kind: "status", id: "rider" },
  { at: 13000, kind: "status", id: "dispatched" },
  { at: 13900, kind: "status", id: "onway" },
  { at: 14800, kind: "status", id: "completed" },
] as const;

// Storefront overlay sub-timeline: browse → checkout → placing → placed.
const MENU_OPEN_AT = 4200;
const CHECKOUT_AT = 6200;
const PLACING_AT = 7400;
const PLACED_AT = 8300;
const MENU_CLOSE_AT = 9200;
const LOOP_AT = 18200;

const STORE = "Spice Garden";
// Emerald accent (storefront / ADD buttons / veg marks) and the blue used for
// the delivery address + checkout primary actions — both taken from the real UI.
const ACCENT = "#059669";
const BLUE = "#2563eb";

const MENU_ITEMS = [
  {
    name: "Butter Chicken",
    price: 320,
    tone: "#E8753B",
    veg: false,
    emoji: "🍛",
    desc: "Tender chicken in a rich, creamy tomato gravy.",
  },
  {
    name: "Paneer Tikka",
    price: 260,
    tone: "#19A463",
    veg: true,
    emoji: "🧆",
    desc: "Char-grilled cottage cheese with smoky spices.",
  },
  {
    name: "Garlic Naan",
    price: 60,
    tone: "#E9B949",
    veg: true,
    emoji: "🫓",
    desc: "Soft tandoor flatbread brushed with garlic butter.",
  },
  {
    name: "Veg Biryani",
    price: 220,
    tone: "#D98324",
    veg: true,
    emoji: "🍚",
    desc: "Fragrant basmati rice layered with spiced vegetables.",
  },
];

export default function WhatsAppOrderDemo({
  // CSS color for the soft glow behind the phone, applied via inline style so it
  // always renders (no Tailwind JIT dependency) and isn't affected by the host's
  // stacking context. Defaults to the WhatsApp green used on the solutions page;
  // the home hero overrides it with the brand orange.
  glowColor = "rgba(37, 211, 102, 0.2)",
}: {
  glowColor?: string;
} = {}) {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>("chat");
  const [manualMenu, setManualMenu] = useState(false);
  const [cart, setCart] = useState<number[]>([]);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // How many chat messages have appeared so far — drives the auto-scroll so the
  // newest status alert is always in view, like a real WhatsApp thread.
  const shownCount = SCRIPT.reduce((n, e) => n + (elapsed >= e.at ? 1 : 0), 0);
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [shownCount]);

  // Single rAF clock drives the whole timeline so it stays in sync and loops.
  useEffect(() => {
    let active = true;
    const tick = (now: number) => {
      if (!active) return;
      if (!startRef.current) startRef.current = now;
      const t = now - startRef.current;
      setElapsed(t);
      if (t >= LOOP_AT) {
        startRef.current = now;
        setPhase("chat");
        setManualMenu(false);
        setCart([]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Drive the menu view from the timeline (unless the user opened it by tapping).
  const autoMenuOpen = elapsed >= MENU_OPEN_AT && elapsed < MENU_CLOSE_AT;
  const showMenu = phase === "menu" || (autoMenuOpen && !manualMenu) || manualMenu;

  // Which storefront screen is showing: browse → checkout → placing → placed.
  // Manual taps just browse the menu; the auto run drives the full flow.
  const storeScreen: "menu" | "checkout" | "placing" | "placed" = manualMenu
    ? "menu"
    : elapsed >= PLACED_AT
      ? "placed"
      : elapsed >= PLACING_AT
        ? "placing"
        : elapsed >= CHECKOUT_AT
          ? "checkout"
          : "menu";

  // Auto-close the manually opened menu so the loop keeps flowing.
  useEffect(() => {
    if (manualMenu) {
      const id = setTimeout(() => setManualMenu(false), 3200);
      return () => clearTimeout(id);
    }
  }, [manualMenu]);

  const visible = (id: string) => {
    const ev = SCRIPT.find((e) => e.id === id);
    return ev ? elapsed >= ev.at : false;
  };

  const cartTotal = cart.reduce((sum, i) => sum + MENU_ITEMS[i].price, 0);

  return (
    <div className="relative w-full flex justify-center">
      {/* Soft glow behind the phone (DOM-ordered before the phone → sits behind
          it; inline style so it's immune to Tailwind JIT / stacking context). */}
      <div
        className="absolute inset-0 mx-auto h-[75%] w-[85%] translate-y-10 rounded-full blur-3xl"
        style={{ background: glowColor }}
      />

      {/* Phone — realistic iPhone-16-like proportions */}
      <div className="relative w-[286px] sm:w-[306px]">
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-[88px] h-7 w-[3px] rounded-l-md bg-gradient-to-b from-[#2c2c2f] to-[#0b0b0c]" />
        <span className="absolute -left-[3px] top-[128px] h-12 w-[3px] rounded-l-md bg-gradient-to-b from-[#2c2c2f] to-[#0b0b0c]" />
        <span className="absolute -left-[3px] top-[186px] h-12 w-[3px] rounded-l-md bg-gradient-to-b from-[#2c2c2f] to-[#0b0b0c]" />
        <span className="absolute -right-[3px] top-[150px] h-16 w-[3px] rounded-r-md bg-gradient-to-b from-[#2c2c2f] to-[#0b0b0c]" />

        {/* Frame + screen */}
        <div className="relative rounded-[2.7rem] border-[11px] border-[#0b0b0c] bg-[#0b0b0c] shadow-[0_30px_70px_-25px_rgba(11,11,12,0.6)] ring-1 ring-white/5">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-[9px] z-50 flex h-[25px] w-[92px] -translate-x-1/2 items-center justify-end gap-2 rounded-full bg-black pr-2.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#10201d]" />
          </div>

          <div className="relative flex h-[612px] flex-col overflow-hidden rounded-[2.05rem] bg-[#EAE1D9]">
            {/* ── WhatsApp chat header ── */}
            <div className="relative z-20 bg-[#008069] text-white">
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-2.5 pb-0.5 text-[10px] font-semibold tabular-nums">
                <span>7:41</span>
                <div className="flex items-center gap-1.5">
                  <SignalGlyph className="h-2.5 w-3.5" />
                  <WifiGlyph className="h-2.5 w-3.5" />
                  <BatteryGlyph className="h-2.5 w-5" />
                </div>
              </div>
              {/* Contact row */}
              <div className="flex items-center gap-3 px-3 pb-2.5 pt-1">
                <ChevronLeft className="h-5 w-5 opacity-90" />
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                  SG
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[14px] font-semibold">{STORE}</p>
                  <p className="text-[11px] text-white/70">
                    {visible("t1") && !visible("welcome") ? "typing…" : "online"}
                  </p>
                </div>
                <WhatsAppGlyph className="h-5 w-5 opacity-80" />
              </div>
            </div>

          {/* ── Chat scroll area ── */}
          <div
            ref={chatRef}
            className="scrollbar-hide relative flex-1 space-y-2 overflow-y-auto px-3 py-3"
            style={{
              backgroundImage:
                "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          >
            <DayPill />

            {/* Customer: "Hi" */}
            {visible("hi") && (
              <Bubble side="out">
                <span className="text-[14px]">Hi</span>
                <Meta side="out" time="7:41 PM" />
              </Bubble>
            )}

            {/* Restaurant typing indicator */}
            {visible("t1") && !visible("welcome") && (
              <Bubble side="in">
                <TypingDots />
              </Bubble>
            )}

            {/* Restaurant welcome + Order Now button */}
            {visible("welcome") && (
              <Bubble side="in" wide>
                <p className="text-[13.5px] leading-snug text-[#111]">
                  Hi 👋 Welcome to <b>{STORE}</b>! 🛒
                  <br />
                  Tap <b>Order Now</b> to place your order.
                </p>
                <p className="mt-1 text-[11px] text-[#667781]">
                  Link valid for 10 minutes ⏱️
                </p>
                <Meta side="in" time="7:41 PM" />
                <button
                  onClick={() => {
                    setManualMenu(true);
                    setPhase("chat");
                  }}
                  className="mt-2 -mx-1 flex w-[calc(100%+0.5rem)] items-center justify-center gap-2 rounded-lg border-t border-black/5 py-2 text-[14px] font-semibold text-[#0a7cff]"
                >
                  <LinkGlyph className="h-4 w-4" />
                  Order Now
                </button>
              </Bubble>
            )}

            {/* Restaurant: order placed receipt */}
            {visible("placed") && (
              <Bubble side="in" wide>
                <p className="text-[13px] font-semibold text-[#111]">
                  ✅ Order #2471 received
                </p>
                <div className="mt-1.5 space-y-0.5 text-[12px] text-[#3b4a54]">
                  <Row l="1× Butter Chicken" r="₹320" />
                  <Row l="2× Garlic Naan" r="₹120" />
                  <Row l="Taxes & charges" r="₹32" />
                  <div className="my-1 h-px bg-black/10" />
                  <Row l="To Pay" r="₹472" bold />
                </div>
                <Meta side="in" time="7:43 PM" />
              </Bubble>
            )}

            {/* Live status alerts */}
            {visible("accepted") && (
              <StatusBubble emoji="👨‍🍳" text="Order accepted — we're on it!" time="7:43 PM" />
            )}
            {visible("ready") && (
              <StatusBubble emoji="🍽️" text="Your food is ready & packed." time="7:48 PM" />
            )}
            {visible("rider") && (
              <StatusBubble emoji="🛵" text="Rider assigned — Ravi is heading to the restaurant." time="7:50 PM" />
            )}
            {visible("dispatched") && (
              <StatusBubble emoji="📦" text="Dispatched! Your order has left Spice Garden." time="7:52 PM" />
            )}
            {visible("onway") && (
              <Bubble side="in" wide>
                <p className="text-[13px] text-[#111]">
                  🛵 <b>On the way!</b> Ravi is 5 mins from you.
                </p>
                <Meta side="in" time="7:55 PM" />
                <button className="mt-2 -mx-1 flex w-[calc(100%+0.5rem)] items-center justify-center gap-2 rounded-lg border-t border-black/5 py-2 text-[14px] font-semibold text-[#0a7cff]">
                  <LinkGlyph className="h-4 w-4" />
                  Track Order Live
                </button>
              </Bubble>
            )}
            {visible("completed") && (
              <StatusBubble emoji="✅" text="Delivered! Enjoy your meal 🎉" time="8:00 PM" />
            )}
          </div>

          {/* ── Chat input bar ── */}
          <div className="relative z-20 flex items-center gap-2 bg-[#EAE1D9] px-3 py-2">
            <div className="flex h-9 flex-1 items-center rounded-full bg-white px-4 text-[13px] text-[#8b9398] shadow-sm">
              Message
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#008069] text-white">
              <MicGlyph className="h-4 w-4" />
            </div>
          </div>

          {/* ── Real storefront UI overlay (V3 style, slides up) ── */}
          <div
            className={`absolute inset-0 z-40 flex flex-col bg-white transition-transform duration-500 ease-out ${
              showMenu ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {storeScreen === "placing" || storeScreen === "placed" ? (
              /* ── Placing / Order-placed screen ── */
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                {storeScreen === "placing" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: ACCENT }} />
                    <p className="mt-4 text-[13px] font-bold text-gray-900">
                      Placing your order…
                    </p>
                    <p className="mt-1 text-[10.5px] text-gray-400">Sending to {STORE}</p>
                  </>
                ) : (
                  <>
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: ACCENT + "15" }}
                    >
                      <CheckCircle2 className="h-9 w-9" style={{ color: ACCENT }} strokeWidth={2.2} />
                    </div>
                    <p className="mt-4 text-[14px] font-extrabold text-gray-900">
                      Order placed!
                    </p>
                    <p className="mt-1 text-[11.5px] font-bold text-gray-700">#2471 · ₹472</p>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-gray-400">
                      We&apos;ve sent the order details to your WhatsApp
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* App bar: deliver-to (browse) or back + title (checkout) */}
                <div className="flex items-center gap-2 border-b border-gray-200/60 px-3 pt-2.5 pb-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <ArrowLeft className="h-4 w-4 text-gray-900" />
                  </span>
                  {storeScreen === "checkout" ? (
                    <p className="flex-1 text-[13px] font-extrabold text-gray-900">
                      Your order
                    </p>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: BLUE }} />
                        <div className="min-w-0 leading-tight">
                          <p className="text-[8.5px] font-semibold uppercase tracking-wide text-gray-400">
                            Deliver to
                          </p>
                          <p className="truncate text-[11px] font-bold" style={{ color: BLUE }}>
                            12 MG Road, Indiranagar…
                          </p>
                        </div>
                        <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
                      </div>
                      <Search className="h-4 w-4 shrink-0 text-gray-900" />
                    </>
                  )}
                </div>

                {storeScreen === "checkout" ? (
                  /* ── Checkout (real order-drawer layout) ── */
                  <>
                    <div className="flex-1 space-y-2.5 overflow-hidden bg-gray-50 px-2.5 pt-2.5">
                      {/* Items card */}
                      <div className="rounded-xl bg-white p-2.5 shadow-sm">
                        {[
                          { name: "Butter Chicken", price: "₹320" },
                          { name: "Garlic Naan", price: "₹120" },
                        ].map((it, idx) => (
                          <div
                            key={it.name}
                            className="flex items-center justify-between gap-2 py-1.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-gray-900">
                              {it.name}
                            </span>
                            <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-1 py-0.5">
                              <Minus className="h-3 w-3" style={{ color: BLUE }} />
                              <span className="min-w-[12px] text-center text-[11px] font-bold text-gray-900">
                                {idx === 1 ? 2 : 1}
                              </span>
                              <Plus className="h-3 w-3" style={{ color: BLUE }} />
                            </div>
                            <span className="w-10 text-right text-[11px] font-bold text-gray-900">
                              {it.price}
                            </span>
                          </div>
                        ))}
                        <div className="mt-1.5 flex gap-2">
                          <span className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-[10px] font-bold text-gray-700">
                            <Pencil className="h-3 w-3" /> Order note
                          </span>
                          <span className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-[10px] font-bold text-gray-700">
                            <Plus className="h-3 w-3" /> Add More Items
                          </span>
                        </div>
                      </div>

                      {/* Savings corner */}
                      <div className="rounded-xl bg-white p-2.5 shadow-sm">
                        <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-wide text-gray-400">
                          Savings corner
                        </p>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: "#ea7a3c" }}
                          >
                            <Tag className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-[12px] font-extrabold text-gray-900">
                            Apply Discounts
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>

                      {/* To Pay card */}
                      <div className="rounded-xl bg-white p-2.5 shadow-sm">
                        <div className="flex items-center gap-2.5 pb-2">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{ backgroundColor: BLUE }}
                          >
                            <ClipboardList className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-[12px] font-extrabold text-gray-900">
                            To Pay ₹472
                          </span>
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="space-y-1 border-t border-gray-100 pt-2 text-[10.5px] text-gray-600">
                          <Row l="Item Total" r="₹440" />
                          <div className="flex justify-between">
                            <span>Delivery Charge</span>
                            <span className="font-semibold" style={{ color: BLUE }}>
                              Informed at delivery
                            </span>
                          </div>
                          <Row l="Parcel Charge" r="₹10" />
                          <Row l="GST & Other Charges" r="₹22" />
                          <div className="my-1 border-t border-dashed border-gray-200" />
                          <Row l="To Pay" r="₹472" bold />
                        </div>
                      </div>
                    </div>

                    {/* Pay + place order bar */}
                    <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-2">
                      <div className="leading-tight">
                        <p className="text-[8.5px] uppercase tracking-wide text-gray-400">
                          Pay using
                        </p>
                        <p className="text-[11px] font-extrabold text-gray-900">
                          Cash on Delivery
                        </p>
                      </div>
                      <div
                        className="ml-auto rounded-lg px-5 py-2 text-[12px] font-extrabold text-white shadow"
                        style={{ backgroundColor: BLUE }}
                      >
                        Place Order
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── Menu (browse) — compact ── */
                  <>
                    <div className="flex-1 overflow-hidden">
                      {/* Auto-login confirmation */}
                      <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        Signed in as Anjali — no login needed
                      </div>

                      {/* Hero */}
                      <div className="px-3 pt-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8753B] to-[#D9412B] text-[12px] font-bold text-white shadow-sm ring-1 ring-black/5">
                            SG
                          </div>
                          <div className="min-w-0 flex-1">
                            <h1
                              className="truncate text-[14px] font-extrabold tracking-tight text-gray-900"
                              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                              {STORE}
                            </h1>
                            <p className="truncate text-[10px] text-gray-400">
                              North Indian · Biryani · Tandoor
                            </p>
                          </div>
                        </div>

                        {/* Contact row */}
                        <div className="mt-2 flex items-center gap-1.5">
                          {[
                            <Phone key="p" className="h-3 w-3 text-gray-900" />,
                            <WhatsAppGlyph key="w" className="h-3 w-3 text-gray-900" />,
                            <MapPin key="m" className="h-3 w-3 text-gray-900" />,
                            <Instagram key="i" className="h-3 w-3 text-gray-900" />,
                          ].map((icon, i) => (
                            <span
                              key={i}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200"
                            >
                              {icon}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Discount banner */}
                      <div className="px-3 py-1.5">
                        <div
                          className="overflow-hidden rounded-xl border"
                          style={{
                            borderColor: ACCENT + "25",
                            background: `linear-gradient(135deg, ${ACCENT}06 0%, ${ACCENT}12 100%)`,
                          }}
                        >
                          <div className="flex items-center gap-2 px-2.5 py-1.5">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: ACCENT + "18" }}
                            >
                              <Tag className="h-3 w-3" style={{ color: ACCENT }} />
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-bold leading-none" style={{ color: ACCENT }}>
                                40% OFF
                              </p>
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                                style={{ backgroundColor: ACCENT + "20", color: ACCENT }}
                              >
                                Auto Apply
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category pills */}
                      <div className="flex gap-1.5 overflow-hidden border-b border-gray-200/60 px-3 py-1.5">
                        {["Main Course", "Breads", "Biryani"].map((c, i) => (
                          <span
                            key={c}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              i === 0 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      {/* Section + items */}
                      <div className="px-3 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-[12px] font-extrabold tracking-tight text-gray-900">
                            Main Course
                          </h2>
                          <span className="text-[10px] text-gray-400">
                            ({MENU_ITEMS.length})
                          </span>
                        </div>
                        <div className="divide-y divide-gray-200/60">
                          {MENU_ITEMS.map((item, i) => {
                            const inCart = cart.includes(i);
                            return (
                              <div key={item.name} className="flex gap-3 py-2">
                                <div className="min-w-0 flex-1">
                                  <span
                                    className="flex h-3 w-3 items-center justify-center rounded-sm border-[1.5px]"
                                    style={{ borderColor: item.veg ? "#059669" : "#dc2626" }}
                                  >
                                    <span
                                      className="h-1 w-1 rounded-full"
                                      style={{ background: item.veg ? "#059669" : "#dc2626" }}
                                    />
                                  </span>
                                  <h3 className="mt-1 text-[12px] font-bold leading-snug text-gray-900">
                                    {item.name}
                                  </h3>
                                  <p className="mt-0.5 text-[11px] font-bold text-gray-900">
                                    ₹{item.price}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-gray-400">
                                    {item.desc}
                                  </p>
                                </div>
                                <div className="relative shrink-0">
                                  <div
                                    className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-xl text-2xl shadow-sm ring-1 ring-black/5"
                                    style={{ background: `${item.tone}1f` }}
                                  >
                                    {item.emoji}
                                  </div>
                                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2">
                                    {inCart ? (
                                      <div className="flex items-center gap-0.5 rounded-md border border-emerald-600/30 bg-white px-0.5 py-0.5 shadow-md">
                                        <button
                                          onClick={() => setCart((c) => c.filter((x) => x !== i))}
                                          className="flex h-5 w-5 items-center justify-center text-emerald-700"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="min-w-[14px] text-center text-[10px] font-extrabold text-emerald-700">
                                          1
                                        </span>
                                        <button className="flex h-5 w-5 items-center justify-center text-emerald-700">
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setCart((c) => [...c, i])}
                                        className="rounded-md border border-emerald-600/30 bg-white px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-md"
                                      >
                                        Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Floating cart bar */}
                    <div className="px-3 pb-4 pt-1.5">
                      <div
                        className="flex items-center justify-between rounded-xl px-4 py-2 text-white shadow-lg"
                        style={{ backgroundColor: ACCENT }}
                      >
                        <span className="text-[11px] font-semibold">
                          {cart.length > 0
                            ? `${cart.length} item${cart.length > 1 ? "s" : ""} · ₹${cartTotal}`
                            : "Your cart"}
                        </span>
                        <span className="text-[11.5px] font-extrabold uppercase tracking-wide">
                          View Cart
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- bits ---------------------------------- */

function Bubble({
  side,
  children,
  wide,
}: {
  side: "in" | "out";
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex ${side === "out" ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative ${wide ? "max-w-[85%]" : "max-w-[78%]"} rounded-lg px-2.5 py-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${
          side === "out" ? "bg-[#D9FDD3]" : "bg-white"
        } animate-[wapop_0.25s_ease-out]`}
      >
        {children}
      </div>
    </div>
  );
}

function Meta({ side, time }: { side: "in" | "out"; time: string }) {
  return (
    <span className="float-right ml-2 mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-[#667781]">
      {time}
      {side === "out" && <CheckCheck className="h-3 w-3 text-[#34b7f1]" />}
    </span>
  );
}

function StatusBubble({
  emoji,
  text,
  time,
}: {
  emoji: string;
  text: string;
  time: string;
}) {
  return (
    <Bubble side="in">
      <p className="text-[13px] text-[#111]">
        {emoji} {text}
      </p>
      <Meta side="in" time={time} />
    </Bubble>
  );
}

function Row({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-[#111]" : ""}`}>
      <span>{l}</span>
      <span>{r}</span>
    </div>
  );
}

function DayPill() {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-md bg-white/80 px-2.5 py-1 text-[10.5px] font-medium text-[#54656f] shadow-sm">
        TODAY
      </span>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#9aa6ac]"
          style={{ animation: `watyping 1s ${i * 0.15}s infinite` }}
        />
      ))}
    </span>
  );
}

/* --------------------------------- glyphs --------------------------------- */

function SignalGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" fill="currentColor" className={className}>
      <rect x="0" y="8" width="3" height="4" rx="0.6" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.6" />
      <rect x="10" y="3" width="3" height="9" rx="0.6" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" />
    </svg>
  );
}

function WifiGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" fill="currentColor" className={className}>
      <path d="M8 2C5 2 2.3 3.2.4 5.1l1.4 1.4C3.4 4.9 5.6 4 8 4s4.6.9 6.2 2.5l1.4-1.4C13.7 3.2 11 2 8 2Z" />
      <path d="M8 6c-1.7 0-3.2.7-4.4 1.8l1.5 1.5C5.8 8.5 6.8 8 8 8s2.2.5 2.9 1.3l1.5-1.5C11.2 6.7 9.7 6 8 6Z" />
      <path d="M8 10c-.6 0-1.2.2-1.6.7L8 12.3l1.6-1.6C9.2 10.2 8.6 10 8 10Z" />
    </svg>
  );
}

function BatteryGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 12" fill="none" className={className}>
      <rect x="0.5" y="1" width="21" height="10" rx="2.5" stroke="currentColor" strokeOpacity="0.5" />
      <rect x="2" y="2.5" width="16" height="7" rx="1" fill="currentColor" />
      <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.16c-.25.69-1.45 1.32-2 1.4-.51.08-1.16.11-1.87-.12-.43-.14-.99-.32-1.7-.63-2.99-1.29-4.94-4.3-5.09-4.5-.15-.2-1.22-1.62-1.22-3.09 0-1.47.77-2.19 1.04-2.49.27-.3.59-.37.79-.37.2 0 .39 0 .57.01.18.01.43-.07.67.51.25.59.84 2.06.91 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.71.81 2 .96.3.15.5.22.57.34.07.12.07.69-.18 1.39Z" />
    </svg>
  );
}

function LinkGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
    </svg>
  );
}
