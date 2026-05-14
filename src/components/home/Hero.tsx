"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLoadScript } from "@react-google-maps/api";
import { toast } from "sonner";
import { Search, MapPin, X, Sparkles, ArrowRight } from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ["places"] = ["places"];

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
}

export default function Hero() {
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typedPlaceholder, setTypedPlaceholder] = useState("Burger Town");

  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

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
            setShowDropdown(true);
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
    const onClick = (e: MouseEvent) => {
      if (!searchBoxRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
      setShowDropdown(false);
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
      /* storage may be disabled — auth page falls back to URL params */
    }
    const params = new URLSearchParams({
      placeId: selected.placeId,
      name: selected.name,
    });
    router.push(`/signup-from-google?${params.toString()}`);
  };

  return (
    <section
      className="relative min-h-[calc(100vh-4rem)] pt-20 md:pt-24"
      style={{
        background:
          "radial-gradient(120% 80% at 80% 0%, #FFF1DF 0%, #FAF5EC 40%, #F6EFE0 100%)",
      }}
    >
      <div className="relative mx-auto max-w-7xl px-6 md:px-10 lg:px-20">
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 pt-10 md:pt-12 pb-32">
          {/* LEFT — copy + CTA */}
          <div className="flex-1 flex flex-col max-w-xl">
            {/* Eyebrow chip */}
            <a
              href="https://www.producthunt.com/products/menuthere"
              target="_blank"
              rel="noopener noreferrer"
              className="self-start inline-flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-white/70 border border-[rgba(11,11,12,0.08)] text-[13px] text-[#2A2A2D] backdrop-blur-md hover:bg-white/85 transition-colors"
            >
              <span className="px-2 py-0.5 bg-[#FF6B2C] text-white rounded-full text-[11px] font-semibold tracking-wider uppercase">
                New
              </span>
              <span>Live on Product Hunt — #22 today</span>
              <svg width="14" height="14" viewBox="0 0 14 14" className="ml-0.5">
                <path
                  d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </a>

            {/* Headline */}
            <h1
              className="mt-6 text-[#0B0B0C] font-medium tracking-tight"
              style={{
                fontSize: "clamp(40px, 6vw, 64px)",
                lineHeight: 1.02,
                letterSpacing: "-0.035em",
              }}
            >
              Own your orders.
              <br />
              <span
                className="text-[#A6A6AB]"
                style={{
                  fontStyle: "italic",
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontWeight: 400,
                  fontSize: "clamp(46px, 6.8vw, 72px)",
                  letterSpacing: "-0.02em",
                }}
              >
                Own your customers.
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-5 text-[14px] sm:text-[15px] text-[#57575B] leading-relaxed max-w-md tracking-[-0.005em]">
              Skip the 30% aggregator cut. Menuthere spins up your branded
              ordering &amp; delivery platform in minutes.
            </p>

            {/* Search CTA */}
            <form onSubmit={handleGenerate} className="mt-8 w-full max-w-[520px]">
              <div className="inline-flex items-center gap-2 text-[12px] font-medium tracking-wider uppercase text-[#76767B] mb-2.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF6B2C]"
                  style={{ boxShadow: "0 0 0 4px rgba(255,107,44,0.18)" }}
                />
                Find your business on Google
              </div>

              <div ref={searchBoxRef} className="relative">
                {selected ? (
                  <div
                    className="flex items-center gap-2 p-1.5 bg-white rounded-[14px] border border-[rgba(11,11,12,0.1)]"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(11,11,12,0.02), 0 14px 30px -20px rgba(11,11,12,0.18)",
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2.5 px-3 py-2">
                      <MapPin className="h-4 w-4 text-[#76767B] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#0B0B0C] truncate leading-tight">
                          {selected.name}
                        </p>
                        {selected.address && (
                          <p className="text-[11px] text-[#76767B] truncate">
                            {selected.address}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[#A6A6AB] hover:text-[#0B0B0C] shrink-0"
                        aria-label="Clear selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center bg-[#0B0B0C] text-white rounded-[10px] px-4 py-2.5 text-[14px] font-medium hover:bg-[#1A1A1C] transition-colors disabled:opacity-60 shrink-0"
                    >
                      {submitting ? "Working..." : "Generate"}
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 p-1.5 bg-white rounded-[14px] border border-[rgba(11,11,12,0.1)]"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(11,11,12,0.02), 0 14px 30px -20px rgba(11,11,12,0.18)",
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2.5 px-3 py-2">
                      <Search className="h-4 w-4 text-[#76767B] shrink-0" />
                      <input
                        type="text"
                        placeholder={
                          isLoaded
                            ? typedPlaceholder
                              ? `Search "${typedPlaceholder}"`
                              : `Search "Burger Town"`
                            : "Loading Google search..."
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={() =>
                          predictions.length > 0 && setShowDropdown(true)
                        }
                        disabled={!isLoaded}
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] text-[#0B0B0C] placeholder:text-[#A6A6AB] tracking-[-0.005em]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center bg-[#0B0B0C] text-white rounded-[10px] px-4 py-2.5 text-[14px] font-medium hover:bg-[#1A1A1C] transition-colors disabled:opacity-60 shrink-0"
                    >
                      Generate
                    </button>
                  </div>
                )}

                {!selected && showDropdown && predictions.length > 0 && (
                  <ul
                    className="absolute z-[70] left-0 right-0 top-full mt-2 max-h-72 overflow-auto rounded-[14px] border border-[rgba(11,11,12,0.1)] bg-white text-left"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(11,11,12,0.04), 0 24px 60px -28px rgba(11,11,12,0.32)",
                    }}
                  >
                    {predictions.map((p) => (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          onClick={() => handlePickPrediction(p)}
                          className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-[#FAF5EC] transition-colors"
                        >
                          <MapPin className="h-4 w-4 text-[#A6A6AB] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#0B0B0C] truncate">
                              {p.structured_formatting?.main_text ||
                                p.description}
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
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[13px] text-[#57575B]">
                Not listed on Google?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/get-started?step=1")}
                  className="text-[#1A1A1C] font-medium border-b border-[rgba(11,11,12,0.25)] pb-px hover:border-[rgba(11,11,12,0.5)] transition-colors inline-flex items-center gap-1"
                >
                  Set up manually
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </form>

          </div>

          {/* RIGHT — product demo video with floating cards */}
          <div className="flex-1 relative hidden md:block min-h-[600px]">
            {/* Demo video — sized to match the original phone mockup */}
            <div
              className="absolute top-0 right-12 w-[286px] h-[600px] rounded-[44px] overflow-hidden bg-[#0B0B0C]"
              style={{
                boxShadow:
                  "0 30px 80px -30px rgba(11,11,12,0.45), 0 12px 24px -12px rgba(11,11,12,0.25)",
              }}
            >
              <video
                src="/demomenuthere.webm"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label="Menuthere product demo"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating — Live order (top-left overlap) */}
            <div className="absolute top-20 -left-2 lg:left-0 animate-[floatA_6s_ease-in-out_infinite] z-20">
              <FloatingCard className="w-[260px]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[#E7F7EE] grid place-items-center">
                    <div
                      className="w-2 h-2 rounded-full bg-[#19A463]"
                      style={{ boxShadow: "0 0 0 4px rgba(25,164,99,0.15)" }}
                    />
                  </div>
                  <div className="text-[12px] text-[#76767B] font-medium">
                    Live · just now
                  </div>
                </div>
                <div className="text-[14px] font-semibold tracking-tight text-[#0B0B0C]">
                  New order — $29.00
                </div>
                <div className="text-[12px] text-[#76767B] mt-0.5">
                  #4127 · Royal Biriyani ×2
                </div>
                <div className="mt-2.5 flex items-center justify-between pt-2.5 border-t border-[rgba(11,11,12,0.06)]">
                  <span className="text-[11px] text-[#76767B]">You keep</span>
                  <span className="text-[13px] font-semibold text-[#19A463]">
                    $28.13 (97%)
                  </span>
                </div>
              </FloatingCard>
            </div>

            {/* Floating — Savings (bottom-left overlap) */}
            <div className="absolute bottom-10 -left-2 lg:left-4 animate-[floatB_7s_ease-in-out_infinite] z-20">
              <FloatingCard className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#76767B] uppercase tracking-wider font-medium">
                    Saved this month
                  </span>
                  <span className="text-[22px] font-semibold tracking-tight text-[#0B0B0C]">
                    $4,820
                  </span>
                </div>
                <svg width="56" height="32" viewBox="0 0 56 32">
                  <path
                    d="M2 26 L10 22 L18 24 L26 16 L34 18 L42 10 L54 4 L54 32 L2 32 Z"
                    fill="#FF6B2C"
                    opacity="0.12"
                  />
                  <path
                    d="M2 26 L10 22 L18 24 L26 16 L34 18 L42 10 L54 4"
                    stroke="#FF6B2C"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </FloatingCard>
            </div>

            {/* Floating — Domain pill (right edge mid) */}
            <div className="absolute top-[340px] -right-2 animate-[floatC_8s_ease-in-out_infinite] z-20">
              <FloatingCard className="flex items-center gap-2 px-3 py-2">
                <div className="w-[18px] h-[18px] rounded bg-[#0B0B0C] grid place-items-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff">
                    <path d="M2 6h6v1.5H2zM2 2h6v1.5H2zM2 4h4v1.5H2z" />
                  </svg>
                </div>
                <span className="font-mono text-[12px] text-[#2A2A2D]">
                  spicegarden.menu
                </span>
                <span className="w-1.5 h-1.5 bg-[#19A463] rounded-full" />
              </FloatingCard>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes floatA {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes floatB {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes floatC {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </section>
  );
}

function FloatingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-3.5 border border-[rgba(11,11,12,0.06)] ${className}`}
      style={{
        boxShadow:
          "0 1px 0 rgba(11,11,12,0.04), 0 24px 60px -28px rgba(11,11,12,0.32)",
      }}
    >
      {children}
    </div>
  );
}

