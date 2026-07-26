"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { placesAutocomplete, type PlacePrediction } from "@/app/actions/placesAutocomplete";
import { televeryAddRestaurant } from "@/app/actions/televeryAddRestaurant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Selected = { placeId: string; name: string; address: string };

/**
 * "Add a restaurant" — the Google-listing signup flow, embedded in the
 * marketplace dashboard. The heavy lifting (creating the partner, defaults,
 * menu, and attaching it to the brand) happens in the televeryAddRestaurant
 * server action; this is just the picker + email field.
 */
export default function AddRestaurantPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [search, setSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drops out-of-order responses — the latest debounced request wins.
  const reqIdRef = useRef(0);
  // One Places session per search → select, so the whole flow bills as one.
  const sessionTokenRef = useRef<string>("");
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
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

  const submit = async () => {
    if (!selected) {
      toast.error("Pick the business from the dropdown");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const res = await televeryAddRestaurant({
        placeId: selected.placeId,
        sessionToken: ensureSessionToken(),
        email: email.trim(),
      });
      if (res.linked) {
        toast.success(`${selected.name} added to your marketplace`);
      } else {
        // Created but not attached — say so plainly instead of implying success.
        toast.warning(
          `${selected.name} was created but could not be linked. Please retry linking it.`,
        );
      }
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Could not add the restaurant");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">
              Add a restaurant
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Find it on Google and we&apos;ll set up its menu and page.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tv-place">Business</Label>
            {selected ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-input px-3 py-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selected.name}
                  </p>
                  {selected.address && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {selected.address}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    setSearch("");
                  }}
                  disabled={submitting}
                  className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-xl border border-input px-3">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="tv-place"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search the restaurant name"
                    className="h-11 min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {predictions.length > 0 && (
                  <ul className="max-h-52 overflow-auto rounded-xl border border-input">
                    {predictions.map((p) => (
                      <li key={p.place_id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected({
                              placeId: p.place_id,
                              name: p.structured_formatting?.main_text || p.description,
                              address: p.structured_formatting?.secondary_text || "",
                            });
                            setPredictions([]);
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

          <div className="space-y-2">
            <Label htmlFor="tv-email">Owner email</Label>
            <Input
              id="tv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground">
              They&apos;ll use this to sign in. A default password is set for them.
            </p>
          </div>

          <button
            onClick={submit}
            disabled={submitting || !selected}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-extrabold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Setting it up…
              </>
            ) : (
              "Add restaurant"
            )}
          </button>
          {submitting && (
            <p className="text-center text-[11px] text-muted-foreground">
              This can take up to a minute — please keep this open.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
