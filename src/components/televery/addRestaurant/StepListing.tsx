"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, Sparkles, X } from "lucide-react";
import {
  placesAutocomplete,
  type PlacePrediction,
} from "@/app/actions/placesAutocomplete";
import { Label } from "@/components/ui/label";

/**
 * Step 1 — optionally start from the restaurant's Google Business listing.
 *
 * Picking one pre-fills the rest of the form (name, phone, address, map pin,
 * country) AND unlocks the richer create path, which additionally pulls a
 * banner photo and AI-written website copy from the listing. Skipping is a
 * first-class choice: plenty of small outlets simply aren't on Google.
 */
export function StepListing({
  placeId,
  listingName,
  listingAddress,
  prefilling,
  disabled,
  ensureSessionToken,
  onSelect,
  onClear,
  onSkip,
}: {
  placeId: string;
  listingName: string;
  listingAddress: string;
  /** True while the Place Details lookup that fills the form is in flight. */
  prefilling: boolean;
  disabled: boolean;
  /**
   * One Places session token per search → select → details, so every keystroke
   * bills as a single session. Owned by the panel because the create call needs
   * the same token.
   */
  ensureSessionToken: () => string;
  onSelect: (p: PlacePrediction) => void;
  onClear: () => void;
  onSkip: () => void;
}) {
  const [search, setSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drops out-of-order responses — the latest debounced request wins.
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (q.length < 3 || placeId) {
      setPredictions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const results = await placesAutocomplete(q, ensureSessionToken());
      if (myReq === reqIdRef.current) {
        setPredictions(results);
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // ensureSessionToken is a stable useCallback in the panel — see its comment.
  }, [search, placeId, ensureSessionToken]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tv-place">Google Business listing (optional)</Label>
        {placeId ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-input px-3 py-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {listingName}
              </p>
              {listingAddress && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {listingAddress}
                </p>
              )}
            </div>
            {prefilling ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="shrink-0 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                aria-label="Clear the listing"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-input px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                id="tv-place"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the restaurant on Google"
                disabled={disabled}
                className="h-11 min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              {searching && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
            </div>
            {predictions.length > 0 && (
              <ul className="max-h-52 overflow-auto rounded-xl border border-input">
                {predictions.map((p) => (
                  <li key={p.place_id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPredictions([]);
                        setSearch("");
                        onSelect(p);
                      }}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {p.structured_formatting?.main_text || p.description}
                        </span>
                        {p.structured_formatting?.secondary_text && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {p.structured_formatting.secondary_text}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {placeId ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 dark:border-orange-900/40 dark:bg-orange-900/15">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <p className="text-[11px] leading-relaxed text-orange-900 dark:text-orange-200">
            We&apos;ve filled in what Google knows — name, phone, address and the
            map pin. Check each one on the next steps; whatever you leave in the
            form is what gets saved. The listing also gives the new page a banner
            photo and a written-up website.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="w-full rounded-xl border border-dashed border-input px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:border-orange-600/40 hover:text-foreground disabled:opacity-50"
        >
          Not on Google? Enter everything manually
        </button>
      )}
    </div>
  );
}
