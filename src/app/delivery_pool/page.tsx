import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  Wallet,
  TrendingUp,
  Store,
  Clock,
  Download,
  Zap,
  IndianRupee,
  Bike,
} from "lucide-react";
import Footer from "@/components/Footer";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.menuthere.go&pcampaignid=web_share";
const APP_STORE_URL =
  "https://apps.apple.com/in/app/menuthere-go/id6784290207";

const DISPLAY_FONT =
  "var(--font-bricolage), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

export const metadata: Metadata = {
  title: "Menuthere Go | Deliver Direct, Keep 100% of Your Earnings",
  description:
    "Partner directly with restaurants for delivery. No commission, no GST cut — keep the full delivery fee on every order. Drive part-time on your own schedule. Download Menuthere Go on Android & iOS.",
  openGraph: {
    title: "Menuthere Go | Deliver Direct, Keep 100% of Your Earnings",
    description:
      "Partner directly with restaurants for delivery. Keep the full fee on every order — no commission, no GST cut.",
    images: ["/og_image.png"],
    type: "website",
    url: "https://menuthere.com/delivery_pool",
  },
  alternates: {
    canonical: "https://menuthere.com/delivery_pool",
  },
};

/* -------------------------------------------------------------------------- */
/*  Store download buttons                                                    */
/* -------------------------------------------------------------------------- */

function StoreButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <Link
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full sm:w-auto items-center justify-center gap-3 bg-[#0A0A0B] text-white px-5 py-3 rounded-2xl hover:bg-[#1A1A1C] transition-all duration-300 active:scale-[0.98] shadow-[0_10px_28px_-14px_rgba(11,11,12,0.6)]"
      >
        <svg
          className="w-6 h-6 fill-current shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85M16.81,8.88L14.54,11.15L6.05,2.66M18.59,10.59L19.53,11.13C20.1,11.45 20.1,12.55 19.53,12.87L18.59,13.41L15.39,12L18.59,10.59Z" />
        </svg>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] uppercase font-medium text-stone-400 tracking-wider">
            Get it on
          </span>
          <span className="text-base font-semibold">Google Play</span>
        </div>
      </Link>

      <Link
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full sm:w-auto items-center justify-center gap-3 bg-[#0A0A0B] text-white px-5 py-3 rounded-2xl hover:bg-[#1A1A1C] transition-all duration-300 active:scale-[0.98] shadow-[0_10px_28px_-14px_rgba(11,11,12,0.6)]"
      >
        <svg
          className="w-7 h-7 fill-current shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.48C2.7 15.25 3.51 7.59 10.2 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.89 3.51-.84 1.54.06 2.68.75 3.37 1.9-3 1.91-2.47 5.86.58 7.35-.61 1.75-1.53 3.07-2.69 4.08h-.01zM13 6.6c.14-1.8 1.48-3.37 2.96-3.6.43 2.27-2.3 3.96-2.96 3.6z" />
        </svg>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] uppercase font-medium text-stone-400 tracking-wider">
            Download on the
          </span>
          <span className="text-base font-semibold">App Store</span>
        </div>
      </Link>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-grid place-items-center h-4 w-4 rounded-full bg-[#E85D04]/12 text-[#E85D04]">
        <Check className="h-2.5 w-2.5 stroke-[3]" />
      </span>
      <span>{children}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sample payout card — the core "keep 100%" hook                            */
/* -------------------------------------------------------------------------- */

function PayoutCard() {
  return (
    <div className="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-end">
      <div className="rounded-3xl border border-[rgba(11,11,12,0.08)] bg-white p-6 sm:p-7 shadow-[0_30px_70px_-30px_rgba(232,93,4,0.35)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8A8A90]">
            Sample payout
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E85D04]/10 px-2.5 py-1 text-[11px] font-semibold text-[#E85D04]">
            <Bike className="h-3 w-3" aria-hidden="true" />1 delivery
          </span>
        </div>

        <dl className="mt-5 space-y-3.5 text-[14.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-[#4A4A50]">Delivery fee</dt>
            <dd className="font-semibold text-[#0A0A0B]">₹60</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#4A4A50]">Platform commission</dt>
            <dd className="flex items-center gap-2">
              <span className="text-[13px] text-[#A8A8AE] line-through">
                ₹15
              </span>
              <span className="font-semibold text-emerald-600">₹0</span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#4A4A50]">GST cut</dt>
            <dd className="flex items-center gap-2">
              <span className="text-[13px] text-[#A8A8AE] line-through">
                ₹11
              </span>
              <span className="font-semibold text-emerald-600">₹0</span>
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex items-end justify-between border-t border-dashed border-[rgba(11,11,12,0.14)] pt-4">
          <div>
            <div className="text-[12.5px] font-medium text-[#4A4A50]">
              You keep
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
              100% yours
            </div>
          </div>
          <div
            className="text-[36px] font-bold leading-none text-[#E85D04]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            ₹60
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[12.5px] text-[#6A6A70]">
        On aggregator apps, commission + GST would quietly eat into every
        payout. Here, they don&apos;t.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

const BENEFITS = [
  {
    icon: Wallet,
    title: "You keep every rupee",
    body: "No commission. No GST deductions. The entire delivery fee is yours to keep.",
  },
  {
    icon: TrendingUp,
    title: "Higher-value orders",
    body: "Direct restaurant orders pay better than the usual aggregator gigs.",
  },
  {
    icon: Store,
    title: "Paid by the restaurant",
    body: "Get paid directly by the restaurants you deliver for — no middleman in between.",
  },
  {
    icon: Clock,
    title: "Drive part-time",
    body: "Go online whenever you're free and earn on your own schedule.",
  },
];

const STEPS = [
  {
    icon: Download,
    title: "Download the app",
    body: "Get Menuthere Go free on Android or iOS and sign up in minutes.",
  },
  {
    icon: Zap,
    title: "Go online",
    body: "Accept direct delivery orders from restaurants around you.",
  },
  {
    icon: IndianRupee,
    title: "Deliver & get paid",
    body: "Complete the drop and keep 100% of the fee — no cuts, ever.",
  },
];

export default function DeliveryPoolPage() {
  return (
    <div className="min-h-screen w-full bg-white geist-font relative">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1 — HERO                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative pt-32 md:pt-40 pb-16 md:pb-24 bg-[#FAF7F0] overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,66,0.12) 0%, rgba(255,138,66,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* copy + CTAs */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
                </span>
                <span>Menuthere Go · For Delivery Partners</span>
              </div>

              <h1
                className="mt-6 text-[#0A0A0B] tracking-tight"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: "clamp(38px, 5.6vw, 68px)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  fontWeight: 600,
                }}
              >
                <span className="inline-block">Deliver direct.</span>
                <br />
                <span
                  className="inline-block text-[#E85D04]"
                  style={{ marginTop: "0.04em" }}
                >
                  Keep 100%.
                </span>
              </h1>

              <p
                className="mt-6 text-[15px] sm:text-[16px] text-[#4A4A50] leading-[1.6] max-w-[520px]"
                style={{ letterSpacing: "-0.005em" }}
              >
                Partner directly with restaurants and deliver on your own
                schedule. No commission. No GST cut. The{" "}
                <strong className="text-[#0A0A0B]">full delivery fee</strong> on
                every order lands straight in your pocket.
              </p>

              <StoreButtons className="mt-8" />

              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[13.5px] text-[#3F3F44] font-medium list-none">
                <li>
                  <Bullet>No commission</Bullet>
                </li>
                <li>
                  <Bullet>No GST cut</Bullet>
                </li>
                <li>
                  <Bullet>Free to join</Bullet>
                </li>
              </ul>
            </div>

            {/* earnings visual */}
            <PayoutCard />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2 — WHY DRIVERS EARN MORE                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2
              className="text-[#0A0A0B] tracking-tight"
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: "clamp(26px, 4vw, 40px)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                fontWeight: 600,
              }}
            >
              More orders. Full pay. Your hours.
            </h2>
            <p className="mt-3 text-[15px] sm:text-[16px] text-[#4A4A50] leading-[1.6]">
              Direct delivery for the restaurants around you — built so you earn
              more per order and keep all of it.
            </p>
          </div>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 list-none">
            {BENEFITS.map((p) => {
              const Icon = p.icon;
              return (
                <li
                  key={p.title}
                  className="flex items-start gap-4 rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-5 sm:p-6 transition-all duration-300 hover:border-[rgba(232,93,4,0.35)] hover:shadow-[0_20px_44px_-26px_rgba(232,93,4,0.4)] motion-safe:hover:-translate-y-0.5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E85D04]/10 text-[#E85D04]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#0A0A0B] tracking-tight">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-[14px] text-[#4A4A50] leading-[1.5]">
                      {p.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3 — HOW IT WORKS                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-[#FAF7F0]">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12 py-16 md:py-24">
          <h2
            className="text-[#0A0A0B] tracking-tight"
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: "clamp(26px, 4vw, 40px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: 600,
            }}
          >
            Start earning in three steps.
          </h2>

          <ol className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-3 list-none">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.title}
                  className="relative rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E85D04]/10 text-[#E85D04]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span
                      className="text-[#E85D04]/25 leading-none"
                      style={{
                        fontFamily: DISPLAY_FONT,
                        fontSize: "40px",
                        fontWeight: 700,
                      }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-[#0A0A0B] tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-[#4A4A50] leading-[1.5]">
                    {s.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 4 — FINAL CTA                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12 pb-20 md:pb-28">
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-12 sm:px-10 sm:py-16 text-center"
            style={{
              background:
                "linear-gradient(135deg, #E85D04 0%, #FF7A2E 55%, #FF8A42 100%)",
            }}
          >
            {/* decorative glow */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1/3 right-0 h-[120%] w-1/2"
              style={{
                background:
                  "radial-gradient(60% 60% at 100% 0%, rgba(255,255,255,0.25) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <h2
                className="text-white mx-auto max-w-[18ch]"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: "clamp(24px, 4.2vw, 40px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  fontWeight: 600,
                }}
              >
                Ready to keep 100% of your earnings?
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-white/90 leading-[1.6] mx-auto max-w-[46ch]">
                Download Menuthere Go and take your first direct order today.
              </p>
              <StoreButtons className="mt-8 justify-center" />
            </div>
          </div>
        </div>
      </section>

      <Footer appName="Menuthere Go" />
    </div>
  );
}
