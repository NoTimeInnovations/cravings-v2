import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, MapPin, Wallet, Heart, TrendingUp } from "lucide-react";
import Footer from "@/components/Footer";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.menuthere.go&pcampaignid=web_share";
const APP_STORE_URL =
  "https://apps.apple.com/in/app/menuthere-go/id6784290207";

export const metadata: Metadata = {
  title: "Menuthere Go | Deliver Nearby, Keep 100% of Your Earnings",
  description:
    "Join your favourite restaurants for direct delivery. Get orders within 5 km of you, keep your complete revenue, and earn more per order. Download Menuthere Go on Android & iOS.",
  openGraph: {
    title: "Menuthere Go | Deliver Nearby, Keep 100% of Your Earnings",
    description:
      "Join your favourite restaurants for direct delivery. Get orders within 5 km of you and keep your complete revenue per order.",
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
        className="inline-flex items-center gap-3 bg-[#0A0A0B] text-white px-5 py-3 rounded-2xl hover:bg-[#1A1A1C] transition-all duration-300 active:scale-[0.98] shadow-[0_10px_28px_-14px_rgba(11,11,12,0.6)]"
      >
        <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24">
          <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85M16.81,8.88L14.54,11.15L6.05,2.66M18.59,10.59L19.53,11.13C20.1,11.45 20.1,12.55 19.53,12.87L18.59,13.41L15.39,12L18.59,10.59Z" />
        </svg>
        <div className="flex flex-col items-start leading-none ml-1">
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
        className="inline-flex items-center gap-3 bg-[#0A0A0B] text-white px-5 py-3 rounded-2xl hover:bg-[#1A1A1C] transition-all duration-300 active:scale-[0.98] shadow-[0_10px_28px_-14px_rgba(11,11,12,0.6)]"
      >
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
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

const POINTS = [
  {
    icon: Wallet,
    title: "Keep your complete revenue",
    body: "No commission cut. Every rupee for the delivery is yours.",
  },
  {
    icon: Heart,
    title: "Join your favourite restaurants",
    body: "Deliver directly for the restaurants you love nearby.",
  },
  {
    icon: MapPin,
    title: "Orders within 5 km",
    body: "Shorter trips, less fuel, more deliveries every hour.",
  },
  {
    icon: TrendingUp,
    title: "Earn more per order",
    body: "Direct delivery pays better than aggregator platforms.",
  },
];

export default function DeliveryPoolPage() {
  return (
    <div className="min-h-screen w-full bg-white geist-font relative">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1 — HERO                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative pt-32 md:pt-40 pb-16 md:pb-20 bg-[#FAF7F0]"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,66,0.10) 0%, rgba(255,138,66,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
          <div className="max-w-3xl">
            {/* copy + CTAs */}
            <div>
              <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
                </span>
                <span>Menuthere Go · For Delivery Partners</span>
              </div>

              <h1
                className="mt-6 text-[#0A0A0B] tracking-tight"
                style={{
                  fontFamily:
                    "var(--font-bricolage), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
                  fontSize: "clamp(40px, 5.6vw, 72px)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  fontWeight: 600,
                }}
              >
                <span className="inline-block">Deliver nearby.</span>
                <br />
                <span
                  className="inline-block text-[#E85D04]"
                  style={{ marginTop: "0.04em" }}
                >
                  Keep 100% of it.
                </span>
              </h1>

              <p
                className="mt-6 text-[15px] sm:text-[16px] text-[#4A4A50] leading-[1.6] max-w-[500px]"
                style={{ letterSpacing: "-0.005em" }}
              >
                Join your favourite restaurants for direct delivery. Get orders
                within <strong className="text-[#0A0A0B]">5 km</strong> of you,
                earn more per order, and keep your{" "}
                <strong className="text-[#0A0A0B]">complete revenue</strong> —
                with no commission cut.
              </p>

              <StoreButtons className="mt-8" />

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13.5px] text-[#3F3F44] font-medium">
                <Bullet>No commission cut</Bullet>
                <Bullet>Orders within 5 km</Bullet>
                <Bullet>Free to join</Bullet>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2 — WHY + CTA                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="flex items-start gap-4 rounded-2xl border border-[rgba(11,11,12,0.08)] p-5 transition-all duration-300 hover:border-[rgba(232,93,4,0.35)]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E85D04]/10 text-[#E85D04]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#0A0A0B] tracking-tight">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-[14px] text-[#4A4A50] leading-[1.5]">
                      {p.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col items-center text-center">
            <p className="text-[15px] text-[#4A4A50]">
              Download Menuthere Go and start earning near you today.
            </p>
            <StoreButtons className="mt-5 justify-center" />
          </div>
        </div>
      </section>

      <Footer appName="Menuthere Go" />
    </div>
  );
}
