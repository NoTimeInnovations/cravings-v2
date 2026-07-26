"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { extractGoogleBusinessDataByPlaceId } from "@/app/actions/extractGoogleBusinessData";
import type { PlacePrediction } from "@/app/actions/placesAutocomplete";
import { televeryAddRestaurant } from "@/app/actions/televeryAddRestaurant";
import { StepDetails } from "@/components/televery/addRestaurant/StepDetails";
import { StepListing } from "@/components/televery/addRestaurant/StepListing";
import { StepLocation } from "@/components/televery/addRestaurant/StepLocation";
import { StepMenu } from "@/components/televery/addRestaurant/StepMenu";
import { StepReview } from "@/components/televery/addRestaurant/StepReview";
import {
  EMPTY_FORM,
  isEmailShaped,
  isPhoneValid,
  sanitizePhone,
  type AddRestaurantForm,
  type DraftItem,
} from "@/components/televery/addRestaurant/types";
import { getCountryByName } from "@/lib/countries";
import { cn } from "@/lib/utils";

const STEPS = ["Listing", "Details", "Location", "Menu", "Review"] as const;

/**
 * Everything a Google listing fills in on the operator's behalf. Wiped whenever
 * the listing changes or is cleared, because a leftover value is invisible:
 * the location card only ever says "Location set", so the previous listing's
 * coordinates look exactly like the right ones — and the create call would then
 * save restaurant B at restaurant A's address.
 */
const LISTING_DERIVED_RESET = {
  listingBusinessName: "",
  phone: "",
  address: "",
  lat: null,
  lng: null,
  pinPlaceId: "",
  district: "",
  state: "",
} satisfies Partial<AddRestaurantForm>;

/**
 * "Add a restaurant" — the full onboarding form, embedded in the marketplace
 * dashboard. It collects everything /get-started collects (name, email, phone,
 * country, currency, a map pin and a menu with images) so an operator can stand
 * a restaurant up end-to-end without the owner ever touching the signup wizard.
 *
 * Starting from a Google Business listing is optional: it pre-fills the form and
 * additionally earns the restaurant a banner photo + AI-written website. With no
 * listing everything comes from the form. Either way the create + brand link
 * happens in the televeryAddRestaurant server action, which is auth-gated on the
 * Televery role.
 *
 * Split across steps deliberately — this is far too many fields for one scroll.
 */
export default function AddRestaurantPanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AddRestaurantForm>(EMPTY_FORM);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [prefilling, setPrefilling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [emailState, setEmailState] = useState<
    "idle" | "checking" | "ok" | "bad"
  >("idle");
  // True while the media-library dialog is up — see the z-index note below.
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  // One Places session token for the whole modal: the autocomplete keystrokes,
  // the pre-fill Place Details call and the create call all carry it, so Google
  // bills them together. Created lazily so a manual creation never mints one.
  const sessionTokenRef = useRef("");
  const ensureSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) sessionTokenRef.current = crypto.randomUUID();
    return sessionTokenRef.current;
  }, []);

  const patch = useCallback(
    (p: Partial<AddRestaurantForm>) => setForm((prev) => ({ ...prev, ...p })),
    [],
  );

  // Sequence guard for the pre-fill lookup: a response for a listing that has
  // since been replaced (or cleared) must not write its values over the current
  // one — same failure as a stale pin, just via a slow network instead.
  const prefillReqRef = useRef(0);

  /** Pull the listing's details and drop them into the form for review. */
  const prefillFromListing = async (prediction: PlacePrediction) => {
    const listingName =
      prediction.structured_formatting?.main_text || prediction.description;
    const req = ++prefillReqRef.current;
    patch({
      placeId: prediction.place_id,
      listingName,
      listingAddress: prediction.structured_formatting?.secondary_text || "",
      // Fill the name straight away so the step isn't empty if the lookup fails.
      name: listingName,
      // Drop the previous listing's values BEFORE the lookup — if it fails (or
      // never returns) the form must be empty-but-honest, not holding someone
      // else's coordinates.
      ...LISTING_DERIVED_RESET,
    });
    setPrefilling(true);
    try {
      const data = await extractGoogleBusinessDataByPlaceId(
        prediction.place_id,
        ensureSessionToken(),
      );
      if (req !== prefillReqRef.current) return;
      const country = data.country || EMPTY_FORM.country;
      const info = getCountryByName(country);
      const phoneCode = info?.dial || EMPTY_FORM.phoneCode;
      patch({
        name: data.name || listingName,
        // Google's own name for the business, which is what the Google create
        // path derives the username from — see StepDetails.
        listingBusinessName: data.name || "",
        country,
        phoneCode,
        currency: info?.currencySymbol || EMPTY_FORM.currency,
        // data.phone is already the bare local number; clamp it to the dial
        // code's digit count so it passes the same validation a typed one does.
        phone: data.phone ? sanitizePhone(data.phone, phoneCode) : "",
        address: data.formattedAddress || "",
        district: data.district || "",
        state: data.state || "",
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        // Held separately so that clearing the listing (and dropping to the
        // manual path) still saves a place_id for the "Open in Maps" link.
        pinPlaceId: data.placeId || prediction.place_id,
      });
    } catch (err) {
      console.error("listing pre-fill failed", err);
      if (req !== prefillReqRef.current) return;
      // The reset above already left the location unset, so the step-2 gate
      // holds until the operator drops a pin themselves.
      toast.error("Couldn't read that listing — fill the details in manually.");
    } finally {
      if (req === prefillReqRef.current) setPrefilling(false);
    }
  };

  const clearListing = () => {
    // Invalidate any lookup still in flight: its answer belongs to the listing
    // being dropped right now.
    prefillReqRef.current += 1;
    setPrefilling(false);
    patch({
      placeId: "",
      listingName: "",
      listingAddress: "",
      ...LISTING_DERIVED_RESET,
    });
  };

  /** What still blocks moving on from the current step (first one is shown). */
  const blockers = useMemo(() => {
    const out: string[] = [];
    if (step === 1) {
      if (!form.name.trim()) out.push("Enter the restaurant name");
      if (!isEmailShaped(form.email)) out.push("Enter a valid email address");
      else if (emailState === "bad") out.push("That email is already a partner");
      else if (emailState === "checking") out.push("Checking the email…");
      if (!isPhoneValid(form.phone, form.phoneCode)) {
        out.push("Enter a valid phone number");
      }
      if (!form.country.trim()) out.push("Pick a country");
      if (!form.currency.trim()) out.push("Pick a currency");
    }
    if (step === 2) {
      if (!form.address.trim()) out.push("Enter the address");
      if (form.lat == null || form.lng == null) out.push("Drop a pin on the map");
    }
    return out;
  }, [step, form, emailState]);

  const submit = async () => {
    setCreating(true);
    try {
      const res = await televeryAddRestaurant({
        details: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone,
          countryCode: form.phoneCode,
          country: form.country.trim(),
          currency: form.currency,
          address: form.address.trim(),
          // Non-null: the step-2 gate above refuses to advance without a pin.
          lat: form.lat!,
          lng: form.lng!,
          district: form.district,
          state: form.state,
          // Only consumed by the manual path — the Google path writes its own
          // place_id from the listing it was built from.
          placeId: form.placeId || form.pinPlaceId || undefined,
        },
        items: items
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            price: Number(i.price) || 0,
            description: i.description,
            category: (i.category || "Menu").trim() || "Menu",
            image_url: i.image_url || undefined,
            variants: i.variants,
          })),
        googlePlaceId: form.placeId || undefined,
        sessionToken: form.placeId ? sessionTokenRef.current : undefined,
      });
      if (res.linked) {
        // The username is whatever the server actually created — on the Google
        // path it comes from Google's name, so never guess it here.
        toast.success(
          `${form.name} added to your marketplace — menuthere.com/${res.username}`,
        );
      } else {
        // Created but not attached — say so plainly instead of implying success,
        // and hand over the id so the link can be retried against something.
        toast.warning(
          `${form.name} was created (id ${res.partnerId}) but could not be linked to your brand. Please retry linking it.`,
        );
      }
      // Anything that went wrong after the partner row existed: the restaurant
      // is real, so these are follow-ups rather than failures.
      res.warnings.forEach((w) => toast.warning(w, { duration: 15000 }));
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || "Could not add the restaurant");
      setCreating(false);
    }
  };

  const busy = creating || prefilling;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-end justify-center bg-black/40 sm:items-center",
        // The media library is a shadcn Dialog, which portals to <body> at
        // z-50. Sitting above it would hide the picker entirely, so the panel
        // steps out of the way while it's open.
        mediaLibraryOpen ? "z-40" : "z-[10000]",
      )}
    >
      <div className="flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-background sm:rounded-3xl">
        <div className="flex items-start gap-3 p-5 pb-3">
          {step > 0 && !creating && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">
              Add a restaurant
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress rail — filled bars for done steps, so the operator can see
            how much is left without a full stepper eating vertical space. */}
        <div className="flex gap-1 px-5 pb-4">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-orange-600" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {step === 0 && (
            <StepListing
              placeId={form.placeId}
              listingName={form.listingName}
              listingAddress={form.listingAddress}
              prefilling={prefilling}
              disabled={busy}
              ensureSessionToken={ensureSessionToken}
              onSelect={prefillFromListing}
              onClear={clearListing}
              onSkip={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepDetails
              form={form}
              disabled={busy}
              onChange={patch}
              onEmailCheck={setEmailState}
            />
          )}
          {step === 2 && (
            <StepLocation form={form} disabled={busy} onChange={patch} />
          )}
          {step === 3 && (
            <StepMenu
              items={items}
              disabled={busy}
              onItemsChange={setItems}
              onMediaLibraryOpenChange={setMediaLibraryOpen}
            />
          )}
          {step === 4 && (
            <StepReview form={form} items={items} creating={creating} />
          )}
        </div>

        <div className="space-y-2 p-5 pt-4">
          {blockers.length > 0 && (
            <p className="text-center text-[11px] text-muted-foreground">
              {blockers[0]}
            </p>
          )}
          <button
            onClick={() => (isLast ? submit() : setStep((s) => s + 1))}
            disabled={busy || blockers.length > 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-extrabold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Setting it up…
              </>
            ) : isLast ? (
              <>
                <Check className="h-4 w-4" /> Create restaurant
              </>
            ) : (
              "Continue"
            )}
          </button>
          {creating && (
            <p className="text-center text-[11px] text-muted-foreground">
              This can take up to a minute — please keep this open.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
