"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { placesAutocomplete, type PlacePrediction } from "@/app/actions/placesAutocomplete";
import { toast } from "sonner";
import { isDevModeOn } from "@/lib/devMode";
import CustomerReviews from "./CustomerReviews";
import WhatsAppOrderDemo from "@/app/solutions/whatsapp-ordering/_components/WhatsAppOrderDemo";
import {
  Search,
  MapPin,
  X,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
}

export default function Hero({ partners = [] }: { partners?: string[] }) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [typedPlaceholder, setTypedPlaceholder] = useState("Burger Town");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drops out-of-order async responses (latest debounced request wins).
  const reqIdRef = useRef(0);
  // One Places session per search → select → signup, shared with the server-side
  // Place Details fetch so the keystroke autocomplete bills as a single session.
  const sessionTokenRef = useRef<string>("");
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    // Only fetch once there are at least 3 characters — skips short, low-signal
    // queries and cuts autocomplete request volume.
    if (q.length < 3 || selected) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const results = await placesAutocomplete(q, ensureSessionToken());
      if (myReq === reqIdRef.current) setPredictions(results);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selected]);

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
    (p: PlacePrediction) => {
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
      // Same session token the autocomplete used → the server Place Details
      // fetch reuses it, so the whole flow bills as one Places session.
      sessionToken: ensureSessionToken(),
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
                        placeholder={`Search "${typedPlaceholder || "Burger Town"}"`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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

              {/* Highlighted WhatsApp ordering callout → dedicated page */}
              <Link
                href="/solutions/whatsapp-ordering"
                aria-label="Explore WhatsApp ordering"
                className="group mt-6 inline-flex items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/[0.07] py-2 pl-2 pr-3.5 transition-all duration-300 hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.12] hover:shadow-[0_12px_28px_-14px_rgba(37,211,102,0.5)] active:scale-[0.99]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-[0_6px_14px_-6px_rgba(37,211,102,0.8)]">
                  <FaWhatsapp className="h-[18px] w-[18px]" />
                </span>
                <span className="text-left leading-tight">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#0A0A0B]">
                    WhatsApp Ordering
                    <span className="rounded-full bg-[#25D366]/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-[#1d9e4e]">
                      New
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#4A4A50]">
                    Customers order on WhatsApp — no app, no login.
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#1d9e4e] transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* RIGHT — the auto-playing WhatsApp ordering phone demo (the same
                component used on /solutions/whatsapp-ordering). Desktop-only. */}
            <div className="hidden lg:block relative hero-fade-in-delayed">
              <WhatsAppOrderDemo glowColor="rgba(234, 88, 12, 0.5)" />
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
