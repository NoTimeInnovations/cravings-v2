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
      className="relative min-h-[100dvh] flex items-center justify-center pt-20 md:pt-24 pb-16 overflow-hidden"
      style={{
        background:
          "radial-gradient(140% 90% at 50% 0%, #FFEFD9 0%, #FAF3E3 35%, #F4EBD8 70%, #EFE4CC 100%)",
      }}
    >
      {/* Atmospheric layers — bottom-anchored warm halo + cursor-following beam. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[15%] -bottom-[25%] h-[110%] z-0 hero-glow-halo"
        style={{
          background:
            "radial-gradient(45% 50% at 50% 75%, rgba(255,107,44,0.36) 0%, rgba(255,107,44,0.18) 30%, rgba(255,107,44,0.05) 55%, transparent 80%)",
          transformOrigin: "50% 100%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -bottom-[20%] w-[70%] h-[100%] z-0 blur-3xl hero-glow-beam"
        style={{
          background:
            "radial-gradient(45% 55% at 50% 85%, rgba(255,107,44,0.45) 0%, rgba(255,140,80,0.22) 35%, transparent 75%)",
          transformOrigin: "50% 100%",
        }}
      />

      {/* Decorative grain — extremely subtle noise for premium texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative w-full mx-auto max-w-7xl px-6 md:px-10 lg:px-20 z-10">
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center text-center w-full">

            {/* Pill — refined glass capsule with hairline gradient ring. */}
            <a
              href="https://www.producthunt.com/products/menuthere"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 pl-2 pr-3.5 py-1 rounded-full bg-white/55 border border-[rgba(11,11,12,0.06)] text-[11.5px] font-medium tracking-[0.005em] text-[#1A1A1C] backdrop-blur-2xl hover:bg-white/75 hover:border-[rgba(11,11,12,0.1)] transition-all duration-300 hero-pill"
              style={{
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 1px rgba(11,11,12,0.03), 0 12px 32px -16px rgba(11,11,12,0.15)",
              }}
            >
              <span className="relative flex h-1.5 w-1.5 ml-0.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF6B2C] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF6B2C]" />
              </span>
              <span>Live on Product Hunt</span>
              <span className="h-2.5 w-px bg-[rgba(11,11,12,0.14)]" aria-hidden />
              <span className="text-[#7A7A7E] tabular-nums">#22 today</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 14 14"
                className="ml-0.5 text-[#7A7A7E] group-hover:text-[#0B0B0C] group-hover:translate-x-0.5 transition-all duration-300"
              >
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
              className="mt-7 text-[#0A0A0B] tracking-tight md:whitespace-nowrap"
              style={{
                fontFamily:
                  "var(--font-bricolage), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
                fontSize: "clamp(34px, 6.4vw, 76px)",
                lineHeight: 0.98,
                letterSpacing: "-0.045em",
                fontWeight: 600,
              }}
            >
              <span className="hero-title-word hero-title-word-1 inline-block">Own</span>{" "}
              <span className="hero-title-word hero-title-word-2 inline-block">your</span>{" "}
              <span className="hero-title-word hero-title-word-3 inline-block">orders.</span>
              <br />
              <span
                className="hero-title-word hero-title-word-4 inline-block"
                style={{
                  marginTop: "0.08em",
                  fontWeight: 400,
                  fontStyle: "italic",
                  letterSpacing: "-0.04em",
                  background:
                    "linear-gradient(180deg, #E89968 0%, #C26B2E 60%, #9A4A1A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Own your customers.
              </span>
            </h1>

            {/* Subhead */}
            <p
              className="mt-6 text-[15px] sm:text-[16px] text-[#3F3F44] leading-[1.55] max-w-[480px] mx-auto"
              style={{ letterSpacing: "-0.005em" }}
            >
              Skip the 30% aggregator cut. Menuthere spins up your branded
              ordering &amp; delivery platform in minutes.
            </p>

            {/* Search CTA */}
            <form
              onSubmit={handleGenerate}
              className="mt-10 w-full max-w-[540px] mx-auto"
            >
              <div ref={searchBoxRef} className="relative">
                {/* Glow ring behind input — picks up the page accent. */}
                <div
                  aria-hidden
                  className="absolute -inset-0.5 rounded-[18px] opacity-60 blur-md pointer-events-none transition-opacity duration-500 group-focus-within:opacity-100"
                  style={{
                    background:
                      "linear-gradient(120deg, rgba(255,107,44,0.18) 0%, rgba(255,200,140,0.10) 40%, rgba(11,11,12,0.05) 100%)",
                  }}
                />

                {selected ? (
                  <div
                    className="relative flex items-center gap-2 p-2 bg-white rounded-[16px] border border-[rgba(11,11,12,0.08)]"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 2px rgba(11,11,12,0.04), 0 22px 50px -28px rgba(11,11,12,0.32), 0 8px 18px -12px rgba(255,107,44,0.18)",
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2.5 px-3 py-2.5">
                      <MapPin className="h-4 w-4 text-[#FF6B2C] shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[14px] font-semibold text-[#0B0B0C] truncate leading-tight tracking-[-0.005em]">
                          {selected.name}
                        </p>
                        {selected.address && (
                          <p className="text-[11.5px] text-[#7A7A7E] truncate mt-0.5">
                            {selected.address}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[#A6A6AB] hover:text-[#0B0B0C] shrink-0 p-1 -m-1 rounded-md hover:bg-[rgba(11,11,12,0.04)] transition-colors"
                        aria-label="Clear selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group/btn relative inline-flex items-center gap-1.5 text-white rounded-[12px] px-4 py-3 text-[14px] font-semibold tracking-[-0.005em] disabled:opacity-60 shrink-0 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background:
                          "linear-gradient(180deg, #1A1A1C 0%, #0B0B0C 100%)",
                        boxShadow:
                          "0 1px 0 rgba(255,255,255,0.08) inset, 0 1px 2px rgba(11,11,12,0.18), 0 8px 20px -8px rgba(11,11,12,0.4)",
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" fill="currentColor" />
                      {submitting ? "Working…" : "Generate"}
                    </button>
                  </div>
                ) : (
                  <div
                    className="relative flex items-center gap-1.5 p-2 bg-white rounded-[16px] border border-[rgba(11,11,12,0.08)] transition-all duration-300 focus-within:border-[rgba(11,11,12,0.18)] focus-within:scale-[1.005]"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.9) inset, 0 1px 2px rgba(11,11,12,0.04), 0 22px 50px -28px rgba(11,11,12,0.32), 0 8px 18px -12px rgba(255,107,44,0.18)",
                    }}
                  >
                    <div className="flex items-center flex-1 min-w-0 gap-2.5 px-3 py-2.5">
                      <Search className="h-4 w-4 text-[#A6A6AB] shrink-0" />
                      <input
                        type="text"
                        placeholder={
                          isLoaded
                            ? typedPlaceholder
                              ? `Search "${typedPlaceholder}"`
                              : `Search "Burger Town"`
                            : "Loading Google search…"
                        }
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={() =>
                          predictions.length > 0 && setShowDropdown(true)
                        }
                        disabled={!isLoaded}
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] text-[#0B0B0C] placeholder:text-[#B2B2B7] tracking-[-0.005em]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group/btn relative inline-flex items-center gap-1.5 text-white rounded-[12px] px-4 py-3 text-[14px] font-semibold tracking-[-0.005em] disabled:opacity-60 shrink-0 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background:
                          "linear-gradient(180deg, #1A1A1C 0%, #0B0B0C 100%)",
                        boxShadow:
                          "0 1px 0 rgba(255,255,255,0.08) inset, 0 1px 2px rgba(11,11,12,0.18), 0 8px 20px -8px rgba(11,11,12,0.4)",
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" fill="currentColor" />
                      Generate
                    </button>
                  </div>
                )}

                {!selected && showDropdown && predictions.length > 0 && (
                  <ul
                    className="absolute z-[70] left-0 right-0 top-full mt-2 max-h-72 overflow-auto rounded-[16px] border border-[rgba(11,11,12,0.08)] bg-white/95 backdrop-blur-xl text-left"
                    style={{
                      boxShadow:
                        "0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 60px -24px rgba(11,11,12,0.28)",
                    }}
                  >
                    {predictions.map((p) => (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          onClick={() => handlePickPrediction(p)}
                          className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-[rgba(255,107,44,0.06)] transition-colors"
                        >
                          <MapPin className="h-4 w-4 text-[#A6A6AB] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#0B0B0C] truncate">
                              {p.structured_formatting?.main_text ||
                                p.description}
                            </p>
                            {p.structured_formatting?.secondary_text && (
                              <p className="text-[12px] text-[#7A7A7E] truncate">
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

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-[#8B6F4E]">
                <span>Not listed on Google?</span>
                <button
                  type="button"
                  onClick={() => router.push("/get-started?step=1")}
                  className="group/m inline-flex items-center gap-1 text-[#3D2B1A] font-medium hover:text-[#C26B2E] transition-colors"
                >
                  <span className="relative">
                    Set up manually
                    <span className="absolute left-0 right-0 -bottom-0.5 h-px bg-current opacity-30 group-hover/m:opacity-100 transition-opacity" />
                  </span>
                  <ArrowRight className="h-3 w-3 group-hover/m:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}


