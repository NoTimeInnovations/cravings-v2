"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { placesAutocomplete, type PlacePrediction } from "@/app/actions/placesAutocomplete";
import { toast } from "sonner";
import {
  Search,
  MapPin,
  X,
  Sparkles,
  Loader2,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { quickSignupFromGoogle } from "@/app/actions/quickSignupFromGoogle";

interface SelectedPlace {
  placeId: string;
  name: string;
  address: string;
}

interface CreatedPartner {
  username: string;
  partnerId: string;
  redirectUrl: string;
}

/**
 * Superadmin "Create Partner V3".
 *
 * Same generation flow as /signup-from-google (Google Places → quick signup),
 * but built for superadmins: type a Google business name, pick it, and create
 * the partner directly — NO email OTP / verification code.
 */
export default function CreatePartnerV3Page() {
  const [search, setSearch] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selected, setSelected] = useState<SelectedPlace | null>(null);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreatedPartner | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);
  // One Places session per search → select → create, shared with the server-side
  // Place Details fetch so the keystroke autocomplete bills as a single session.
  const sessionTokenRef = useRef<string>("");
  const ensureSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  };

  // Debounced Google Places autocomplete by business name (server-proxied so the
  // session token can be shared with the server-side Place Details fetch).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    // Only fetch once there are at least 3 characters.
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

  const handlePick = useCallback(
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

  const handleClear = () => {
    setSelected(null);
    setSearch("");
    setPredictions([]);
  };

  const handleCreate = async () => {
    if (!selected) {
      toast.error("Pick a business from the dropdown");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid login email for the partner");
      return;
    }
    setCreating(true);
    try {
      // No OTP — superadmin creates the partner straight away.
      const res = await quickSignupFromGoogle({
        placeId: selected.placeId,
        sessionToken: ensureSessionToken(),
        email: email.trim(),
      });
      setResult(res);
      toast.success(`Partner created: ${res.username}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create partner");
    } finally {
      setCreating(false);
    }
  };

  const resetAll = () => {
    setResult(null);
    setSelected(null);
    setSearch("");
    setPredictions([]);
    setEmail("");
  };

  // ── Success view ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <Shell>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            Partner created
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-semibold">@{result.username}</span> is live —
            no verification needed.
          </p>

          <div className="mt-4 rounded-lg bg-white border border-green-100 p-3 text-left text-xs text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-800">Username:</span>{" "}
              {result.username}
            </p>
            <p>
              <span className="font-medium text-gray-800">Partner ID:</span>{" "}
              {result.partnerId}
            </p>
            <p>
              <span className="font-medium text-gray-800">Login email:</span>{" "}
              {email}
            </p>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href={result.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 text-white text-sm font-medium px-4 h-11 hover:bg-stone-800"
            >
              <ExternalLink className="h-4 w-4" />
              View site
            </a>
            <a
              href={`/${result.username}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-sm font-medium px-4 h-11 hover:bg-stone-50"
            >
              Open admin
            </a>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-sm font-medium px-4 h-11 hover:bg-stone-50"
            >
              Create another
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <Shell>
      <p className="text-sm text-stone-600 mb-5">
        Type a Google business name, pick it, and create the partner instantly —
        same generation as the signup flow, but with no email verification code.
      </p>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
        {/* Google business search */}
        <div className="relative">
          <label className="text-sm font-medium text-gray-800 mb-1.5 block">
            Google business
          </label>
          {selected ? (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
              <MapPin className="h-4 w-4 text-orange-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {selected.name}
                </p>
                {selected.address && (
                  <p className="text-xs text-stone-500 truncate">
                    {selected.address}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-stone-400 hover:text-gray-900 shrink-0"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 focus-within:border-orange-400">
              <Search className="h-4 w-4 text-stone-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search business name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-stone-400"
              />
            </div>
          )}

          {!selected && predictions.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-xl border border-stone-200 bg-white shadow-lg">
              {predictions.map((p) => (
                <li key={p.place_id}>
                  <button
                    type="button"
                    onClick={() => handlePick(p)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-orange-50"
                  >
                    <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.structured_formatting?.main_text || p.description}
                      </p>
                      {p.structured_formatting?.secondary_text && (
                        <p className="text-xs text-stone-500 truncate">
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

        {/* Partner login email */}
        <div>
          <label
            htmlFor="v3-email"
            className="text-sm font-medium text-gray-800 mb-1.5 block"
          >
            Partner login email
          </label>
          <input
            id="v3-email"
            type="email"
            placeholder="owner@restaurant.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-gray-900 outline-none focus:border-orange-400"
          />
          <p className="mt-1.5 text-xs text-stone-400">
            Used as the partner&apos;s login. A placeholder password is set —
            reset it later from Edit Partners.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !selected || !email}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating &amp; creating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate &amp; create partner
            </>
          )}
        </button>
      </div>
    </Shell>
  );
}

/** Page chrome shared by both the form and success views. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FFF7EC] px-3 py-5 pt-24 sm:px-[7.5%]">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl lg:text-4xl font-bold mb-5">
          Create Partner V3
        </h1>
        {children}
      </div>
    </main>
  );
}
