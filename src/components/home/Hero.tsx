"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLoadScript } from "@react-google-maps/api";
import { toast } from "sonner";
import { isDevModeOn } from "@/lib/devMode";
import CustomerReviews from "./CustomerReviews";
import {
  Search,
  MapPin,
  X,
  Sparkles,
  Check,
  ShoppingBag,
  Users,
  BarChart3,
  Megaphone,
  Settings,
  LayoutDashboard,
  Utensils,
} from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ["places"] = ["places"];

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
}

export default function Hero({ partners = [] }: { partners?: string[] }) {
  const router = useRouter();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [search, setSearch] = useState("");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [typedPlaceholder, setTypedPlaceholder] = useState("Burger Town");

  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current =
        new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !autocompleteServiceRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (!q || selected) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      autocompleteServiceRef.current!.getPlacePredictions(
        { input: q, types: ["establishment"] },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            setPredictions(results);
          } else {
            setPredictions([]);
          }
        },
      );
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, isLoaded, selected]);

  useEffect(() => {
    if (search || selected) return;
    const examples = [
      "Burger Town",
      "Pizza Palace",
      "Spice Garden",
      "Brew & Bite",
      "Sushi Express",
    ];
    let exampleIdx = 0;
    let charIdx = examples[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = examples[exampleIdx];
      if (!deleting) {
        charIdx += 1;
        setTypedPlaceholder(word.slice(0, charIdx));
        if (charIdx === word.length) {
          timer = setTimeout(() => {
            deleting = true;
            tick();
          }, 1800);
          return;
        }
      } else {
        charIdx -= 1;
        setTypedPlaceholder(word.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          exampleIdx = (exampleIdx + 1) % examples.length;
        }
      }
      timer = setTimeout(tick, deleting ? 35 : 80);
    };
    timer = setTimeout(tick, 1800);
    return () => clearTimeout(timer);
  }, [search, selected]);

  const handlePickPrediction = useCallback(
    (p: google.maps.places.AutocompletePrediction) => {
      setSelected({
        placeId: p.place_id,
        name: p.structured_formatting?.main_text || p.description,
        address: p.structured_formatting?.secondary_text || "",
      });
      setSearch(p.structured_formatting?.main_text || p.description);
      setPredictions([]);
    },
    [],
  );

  const handleClearSelection = () => {
    setSelected(null);
    setSearch("");
    setPredictions([]);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick your business from the dropdown");
      return;
    }
    setSubmitting(true);
    try {
      sessionStorage.setItem("gbp_signup_place", JSON.stringify(selected));
    } catch {
      /* storage may be disabled */
    }
    const params = new URLSearchParams({
      placeId: selected.placeId,
      name: selected.name,
    });
    // Carry the persisted dev flag so the signup page skips OTP without the
    // worker having to manually append &dev=1.
    if (isDevModeOn()) params.set("dev", "1");
    router.push(`/signup-from-google?${params.toString()}`);
  };

  return (
    <section
        className="relative pt-32 md:pt-40 pb-16 md:pb-24 bg-[#FAF7F0]"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(255,138,66,0.10) 0%, rgba(255,138,66,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
          {/* HERO — two columns on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
            {/* LEFT — copy + CTAs */}
            <div className="hero-fade-in">
              {/* Pill */}
              <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[rgba(232,93,4,0.18)] text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#E85D04] shadow-[0_2px_8px_-3px_rgba(232,93,4,0.25)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-70 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E85D04]" />
                </span>
                <span>Live on Product Hunt</span>
                <span className="h-2.5 w-px bg-[rgba(232,93,4,0.3)]" aria-hidden />
                <span className="tabular-nums">#22 today</span>
              </div>

              {/* Headline */}
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
                <span className="hero-title-word hero-title-word-1 inline-block">Own your orders.</span>
                <br />
                <span
                  className="hero-title-word hero-title-word-2 inline-block text-[#E85D04]"
                  style={{ marginTop: "0.04em" }}
                >
                  Own your customers.
                </span>
              </h1>

              {/* Subhead */}
              <p
                className="mt-6 text-[15px] sm:text-[16px] text-[#4A4A50] leading-[1.6] max-w-[480px]"
                style={{ letterSpacing: "-0.005em" }}
              >
                Skip the 30% aggregator cut. Menuthere spins up your branded
                ordering &amp; delivery platform in minutes.
              </p>

              {/* CTA — Google Places search inline */}
              <form
                onSubmit={handleGenerate}
                className="mt-8 w-full max-w-[520px]"
              >
                {selected ? (
                  <div
                    className="flex items-center gap-1.5 p-2 bg-white rounded-[16px] border border-[rgba(11,11,12,0.1)]"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 32px -16px rgba(11,11,12,0.18), 0 6px 16px -10px rgba(232,93,4,0.22)",
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2.5 px-3 py-2">
                      <MapPin className="h-4 w-4 text-[#E85D04] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#0A0A0B] truncate leading-tight">
                          {selected.name}
                        </p>
                        {selected.address && (
                          <p className="text-[11.5px] text-[#76767B] truncate mt-0.5">
                            {selected.address}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[#A6A6AB] hover:text-[#0A0A0B] shrink-0 p-1 -m-1 rounded-md hover:bg-[rgba(11,11,12,0.04)] transition-colors"
                        aria-label="Clear"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 bg-[#0A0A0B] hover:bg-[#1A1A1C] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60 shrink-0 transition-all duration-300 active:scale-[0.98] shadow-[0_8px_20px_-10px_rgba(11,11,12,0.45)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" fill="currentColor" />
                      {submitting ? "Working…" : "Generate"}
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 p-2 bg-white rounded-[16px] border border-[rgba(11,11,12,0.1)] transition-all duration-300 focus-within:border-[rgba(11,11,12,0.2)]"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 32px -16px rgba(11,11,12,0.18), 0 6px 16px -10px rgba(232,93,4,0.22)",
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2.5 px-3 py-2">
                      <Search className="h-4 w-4 text-[#A6A6AB] shrink-0" />
                      <input
                        type="text"
                        placeholder={
                          isLoaded
                            ? `Search "${typedPlaceholder || "Burger Town"}"`
                            : "Loading Google search…"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        disabled={!isLoaded}
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] text-[#0A0A0B] placeholder:text-[#B2B2B7] tracking-[-0.005em]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 bg-[#0A0A0B] hover:bg-[#1A1A1C] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold disabled:opacity-60 shrink-0 transition-all duration-300 active:scale-[0.98] shadow-[0_8px_20px_-10px_rgba(11,11,12,0.45)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" fill="currentColor" />
                      Generate
                    </button>
                  </div>
                )}

                {!selected && predictions.length > 0 && (
                  <ul className="mt-2 max-h-60 overflow-auto rounded-[14px] border border-[rgba(11,11,12,0.08)] bg-white text-left shadow-[0_24px_60px_-24px_rgba(11,11,12,0.28)]">
                    {predictions.map((p) => (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          onClick={() => handlePickPrediction(p)}
                          className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-[rgba(232,93,4,0.06)] transition-colors"
                        >
                          <MapPin className="h-4 w-4 text-[#A6A6AB] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#0A0A0B] truncate">
                              {p.structured_formatting?.main_text || p.description}
                            </p>
                            {p.structured_formatting?.secondary_text && (
                              <p className="text-[12px] text-[#76767B] truncate">
                                {p.structured_formatting.secondary_text}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </form>

              {/* Checkmark bullets */}
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13.5px] text-[#3F3F44] font-medium">
                <Bullet>No commission</Bullet>
                <Bullet>Your brand</Bullet>
                <Bullet>Live in minutes</Bullet>
              </div>
            </div>

            {/* RIGHT — dashboard mockup + floating storefront cart.
                Hidden on mobile to keep the hero short and copy-first;
                the dashboard story is desktop-only marketing. */}
            <div className="hidden lg:block relative hero-fade-in-delayed">
              <DashboardMockup />
              <StorefrontCartCard />
            </div>
          </div>

          {/* TRUST BAR — real partner names sorted by delivery volume.
              Hidden entirely if the Hasura fetch returned nothing so we
              don't ship an empty caption to production. */}
          {partners.length > 0 && (
            <div className="mt-20 lg:mt-28 pt-10 border-t border-[rgba(11,11,12,0.08)]">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8E8E94]">
                Trusted by restaurants growing their brand
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 lg:gap-x-16 gap-y-6 text-[#3F3F44]">
                {partners.map((name, i) => (
                  <PartnerLogo key={name} name={name} variant={i % 5} />
                ))}
              </div>
            </div>
          )}

          {/* CUSTOMER REVIEWS — two partner testimonials side by side */}
          <CustomerReviews />
        </div>
      </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small primitives                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Renders a partner name as a "logo-like" wordmark. Cycles through 5
 * typographic variants so the strip reads as a row of distinct brands
 * rather than a uniform list. Variant is just `index % 5`.
 *
 *  0  Bold display caps     (HILLTOWN)
 *  1  Italic serif title    (Hotel Malabar)
 *  2  Stacked tagline       (JUIZY · MAN)
 *  3  Two-tone Title.Case   (Petraz restaurant)
 *  4  Outline-style caps    (APPARY'S)
 */
function PartnerLogo({ name, variant }: { name: string; variant: number }) {
  const titleCase = (s: string) =>
    s
      .toLowerCase()
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  if (variant === 0) {
    return (
      <span
        className="text-[18px] sm:text-[20px] font-extrabold uppercase tracking-[0.04em] leading-none"
        style={{
          fontFamily:
            "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {name.toUpperCase()}
      </span>
    );
  }
  if (variant === 1) {
    return (
      <span
        className="text-[19px] sm:text-[21px] italic tracking-tight leading-none"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        {titleCase(name)}
      </span>
    );
  }
  if (variant === 2) {
    const parts = name.toUpperCase().split(/\s+/);
    const first = parts.shift() ?? "";
    const rest = parts.join(" ");
    return (
      <span
        className="inline-flex flex-col items-center leading-none gap-0.5"
        style={{
          fontFamily:
            "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <span className="text-[18px] sm:text-[20px] font-extrabold tracking-tight">
          {first}
        </span>
        {rest && (
          <span className="text-[9px] tracking-[0.22em] font-semibold opacity-70">
            {rest}
          </span>
        )}
      </span>
    );
  }
  if (variant === 3) {
    const parts = titleCase(name).split(/\s+/);
    const first = parts.shift() ?? "";
    const rest = parts.join(" ");
    return (
      <span className="inline-flex items-baseline gap-1.5 leading-none">
        <span
          className="text-[19px] sm:text-[21px] font-bold tracking-tight"
          style={{
            fontFamily:
              "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          {first}
        </span>
        {rest && (
          <span
            className="text-[14px] sm:text-[15px] italic opacity-65"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {rest.toLowerCase()}
          </span>
        )}
      </span>
    );
  }
  // variant === 4
  return (
    <span
      className="text-[15px] sm:text-[16px] font-semibold uppercase tracking-[0.28em] leading-none px-3 py-1.5 border border-current rounded-full opacity-85"
      style={{
        fontFamily:
          "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {name.toUpperCase()}
    </span>
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
/*  Dashboard mockup (HTML/CSS — no images)                                   */
/* -------------------------------------------------------------------------- */

function DashboardMockup() {
  return (
    <div
      className="relative rounded-2xl bg-white border border-[rgba(11,11,12,0.08)] overflow-hidden"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 60px -24px rgba(11,11,12,0.18), 0 12px 30px -16px rgba(232,93,4,0.12)",
      }}
    >
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden sm:flex flex-col w-[148px] lg:w-[160px] bg-[#FAFAF8] border-r border-[rgba(11,11,12,0.06)] py-4">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 pb-4 border-b border-[rgba(11,11,12,0.05)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/menuthere-logo-new.png"
              alt="Menuthere"
              width={28}
              height={28}
              className="h-7 w-7 object-contain rounded-md"
              draggable={false}
            />
            <span className="text-[13px] font-bold text-[#0A0A0B] tracking-tight">
              Menuthere
            </span>
          </div>
          <nav className="flex flex-col mt-2 px-2 gap-[2px]">
            <NavItem icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Overview" active />
            <NavItem icon={<ShoppingBag className="h-3.5 w-3.5" />} label="Orders" />
            <NavItem icon={<Users className="h-3.5 w-3.5" />} label="Customers" />
            <NavItem icon={<Utensils className="h-3.5 w-3.5" />} label="Menu" />
            <NavItem icon={<BarChart3 className="h-3.5 w-3.5" />} label="Analytics" />
            <NavItem icon={<Megaphone className="h-3.5 w-3.5" />} label="Marketing" />
            <NavItem icon={<Settings className="h-3.5 w-3.5" />} label="Settings" />
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 p-4 sm:p-5 lg:p-6 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h4 className="text-[14px] sm:text-[15px] font-bold text-[#0A0A0B] tracking-tight">
                Good morning, Alex 👋
              </h4>
              <p className="text-[11px] text-[#76767B] mt-0.5">
                Here&apos;s what&apos;s happening with your business.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[#3F3F44] px-2.5 py-1 rounded-md border border-[rgba(11,11,12,0.1)] bg-white">
              This week
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mb-5">
            <StatCard label="Total Orders" value="1,248" delta="+18.6%" />
            <StatCard label="Revenue" value="$24,560" delta="+22.4%" />
            <StatCard label="Customers" value="856" delta="+15.2%" />
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-[rgba(11,11,12,0.06)] p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-[#3F3F44]">Revenue Overview</p>
              <span className="text-[9.5px] text-[#76767B]">This week</span>
            </div>
            <RevenueChart />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium ${
        active
          ? "bg-white text-[#E85D04] border border-[rgba(232,93,4,0.15)] shadow-[0_1px_2px_rgba(11,11,12,0.04)]"
          : "text-[#5A5A60]"
      }`}
    >
      <span className={active ? "text-[#E85D04]" : "text-[#8E8E94]"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-lg border border-[rgba(11,11,12,0.06)] p-2.5 bg-white">
      <p className="text-[9.5px] font-medium text-[#76767B] uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-[14px] sm:text-[15px] font-bold text-[#0A0A0B] tabular-nums">
          {value}
        </span>
        <span className="inline-flex items-center text-[9.5px] font-semibold text-[#19A463] tabular-nums">
          <svg width="8" height="8" viewBox="0 0 8 8" className="mr-0.5">
            <path d="M4 1L7 6H1L4 1z" fill="currentColor" />
          </svg>
          {delta}
        </span>
      </div>
    </div>
  );
}

function RevenueChart() {
  // 7 daily revenue points, mapped to an SVG line + area fill.
  const points = [5, 9, 7, 11, 13, 10, 16];
  const max = 18;
  const w = 280;
  const h = 80;
  const stepX = w / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = h - (p / max) * h;
    return { x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h + 16}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ minHeight: 80 }}
    >
      <defs>
        <linearGradient id="rev-area" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E85D04" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#E85D04" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1="0"
          x2={w}
          y1={h * t}
          y2={h * t}
          stroke="rgba(11,11,12,0.05)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#rev-area)" />
      <path
        d={line}
        fill="none"
        stroke="#E85D04"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#fff" stroke="#E85D04" strokeWidth="1.5" />
      ))}
      {/* day labels */}
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Su"].map((d, i) => (
        <text
          key={d}
          x={i * stepX}
          y={h + 12}
          textAnchor="middle"
          fontSize="8"
          fill="#A6A6AB"
          fontWeight="500"
        >
          {d}
        </text>
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Floating storefront cart card (overlaps dashboard's bottom-right corner)  */
/* -------------------------------------------------------------------------- */

function StorefrontCartCard() {
  return (
    <div
      className="hidden md:block absolute -bottom-6 -right-2 lg:-right-8 w-[240px] rounded-2xl bg-white border border-[rgba(11,11,12,0.08)] overflow-hidden hero-cart-float"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 60px -20px rgba(11,11,12,0.28), 0 14px 28px -16px rgba(232,93,4,0.22)",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[rgba(11,11,12,0.04)]">
        <span className="text-[11.5px] font-bold text-[#0A0A0B]">Your Brand</span>
        <span className="flex flex-col gap-[2px]">
          <span className="w-3 h-[1.5px] bg-[#3F3F44] rounded-full" />
          <span className="w-3 h-[1.5px] bg-[#3F3F44] rounded-full" />
          <span className="w-3 h-[1.5px] bg-[#3F3F44] rounded-full" />
        </span>
      </div>
      {/* Category pills */}
      <div className="px-4 pt-2.5 pb-2 flex items-center gap-3 text-[10px]">
        <span className="text-[#A6A6AB]">Popular</span>
        <span className="relative font-semibold text-[#E85D04]">
          Pizzas
          <span className="absolute -bottom-[3px] left-0 right-0 h-[1.5px] bg-[#E85D04]" />
        </span>
        <span className="text-[#A6A6AB]">Sides</span>
        <span className="text-[#A6A6AB]">Drinks</span>
      </div>
      {/* Items */}
      <ul className="px-3 pb-3 space-y-2">
        <CartItem
          name="Margherita Pizza"
          desc="Fresh tomatoes, mozzarella, basil & olive oil"
          price="$14.99"
          tone="#F2C94C"
        />
        <CartItem
          name="Pepperoni Pizza"
          desc="Classic pepperoni with mozzarella"
          price="$15.99"
          tone="#EB5757"
        />
        <CartItem
          name="Garlic Bread"
          desc="Crispy garlic bread with herb butter"
          price="$6.99"
          tone="#F2994A"
        />
      </ul>
      {/* Footer cart bar */}
      <div className="m-3 mt-1 rounded-xl bg-[#E85D04] text-white flex items-center justify-between px-3 py-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <span className="grid place-items-center h-4 w-4 rounded-full bg-white text-[#E85D04] text-[9px] font-bold">
            3
          </span>
          View Cart
        </span>
        <span>$37.97</span>
      </div>
    </div>
  );
}

function CartItem({
  name,
  desc,
  price,
  tone,
}: {
  name: string;
  desc: string;
  price: string;
  tone: string;
}) {
  return (
    <li className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg">
      {/* Tiny circular "image" */}
      <span
        className="shrink-0 grid place-items-center h-8 w-8 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${tone}30 0%, ${tone}80 65%, ${tone} 100%)`,
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-semibold text-[#0A0A0B] truncate leading-tight">
          {name}
        </p>
        <p className="text-[9px] text-[#76767B] truncate leading-tight mt-0.5">
          {desc}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] font-bold text-[#0A0A0B] tabular-nums">{price}</span>
        <button className="text-[9px] font-bold uppercase tracking-wider text-[#E85D04] bg-[#E85D04]/10 px-1.5 py-0.5 rounded">
          Add
        </button>
      </div>
    </li>
  );
}

