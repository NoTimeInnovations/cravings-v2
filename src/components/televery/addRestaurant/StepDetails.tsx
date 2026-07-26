"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { checkEmailUnique } from "@/app/actions/checkEmail";
import { checkUsernameAvailable } from "@/app/actions/checkUsername";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getCountryByName } from "@/lib/countries";
import { CURRENCY_OPTIONS } from "@/lib/worldCurrencies";
import {
  COUNTRY_OPTIONS,
  DIAL_OPTIONS,
  isEmailShaped,
  isPhoneValid,
  maxPhoneDigits,
  sanitizePhone,
  slugifyUsername,
  type AddRestaurantForm,
} from "./types";

type Check = "idle" | "checking" | "ok" | "bad";

/**
 * Step 2 — who the restaurant is. Same field set (and the same validation
 * rules) the public /get-started wizard collects, so an operator-created
 * restaurant is indistinguishable from a self-serve one.
 */
export function StepDetails({
  form,
  disabled,
  onChange,
  onEmailCheck,
}: {
  form: AddRestaurantForm;
  disabled: boolean;
  onChange: (patch: Partial<AddRestaurantForm>) => void;
  /** Bubbles the "this email is already a partner" verdict up to the submit gate. */
  onEmailCheck: (state: Check) => void;
}) {
  const [emailState, setEmailState] = useState<Check>("idle");
  const [usernameState, setUsernameState] = useState<Check>("idle");
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drop out-of-order responses so a slow early request can't overwrite a
  // later verdict for a different value.
  const emailReq = useRef(0);
  const usernameReq = useRef(0);

  // The Google create path builds the username from GOOGLE's name for the
  // listing and nothing patches it afterwards, so previewing a slug of the
  // (editable) form name there would advertise a URL that never gets created.
  // Preview what will actually be used — and when Google's name never arrived
  // (failed lookup), preview nothing at all rather than guess.
  const fromListing = Boolean(form.placeId);
  const usernameSeed = fromListing ? form.listingBusinessName : form.name;
  const username = slugifyUsername(usernameSeed);
  const renamedFromListing =
    fromListing && slugifyUsername(form.name) !== username;
  const phoneOk = !form.phone || isPhoneValid(form.phone, form.phoneCode);

  useEffect(() => {
    onEmailCheck(emailState);
  }, [emailState, onEmailCheck]);

  // Debounced "is this email free?" — surfaced here rather than only on submit,
  // because the operator has four more steps to fill in before finding out.
  useEffect(() => {
    if (emailTimer.current) clearTimeout(emailTimer.current);
    const email = form.email.trim().toLowerCase();
    if (!isEmailShaped(email)) {
      setEmailState("idle");
      return;
    }
    setEmailState("checking");
    emailTimer.current = setTimeout(async () => {
      const req = ++emailReq.current;
      try {
        const { isUnique } = await checkEmailUnique(email);
        if (req === emailReq.current) setEmailState(isUnique ? "ok" : "bad");
      } catch {
        // Network hiccup — don't block the operator; the server re-checks.
        if (req === emailReq.current) setEmailState("idle");
      }
    }, 600);
    return () => {
      if (emailTimer.current) clearTimeout(emailTimer.current);
    };
  }, [form.email]);

  // The username is derived, not typed — this is only a heads-up that the
  // pretty URL is taken. The server appends a number when it is.
  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (username.length < 3) {
      setUsernameState("idle");
      return;
    }
    setUsernameState("checking");
    usernameTimer.current = setTimeout(async () => {
      const req = ++usernameReq.current;
      try {
        const { isAvailable } = await checkUsernameAvailable(username);
        if (req === usernameReq.current) {
          setUsernameState(isAvailable ? "ok" : "bad");
        }
      } catch {
        if (req === usernameReq.current) setUsernameState("idle");
      }
    }, 600);
    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
    };
  }, [username]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tv-name">
          Restaurant name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="tv-name"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Kada Bakery"
          disabled={disabled}
        />
        {username.length >= 3 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">menuthere.com/{username}</span>
            {usernameState === "checking" && (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            )}
            {usernameState === "ok" && (
              <Check className="h-3 w-3 shrink-0 text-green-600" />
            )}
            {usernameState === "bad" && (
              <span className="shrink-0 text-amber-600 dark:text-amber-400">
                — taken, we&apos;ll add a number
              </span>
            )}
          </p>
        )}
        {renamedFromListing && (
          <p className="text-[11px] text-muted-foreground">
            The page URL comes from the Google listing&apos;s name, not the name
            typed above.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tv-email">
          Owner email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="tv-email"
          type="email"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="owner@example.com"
          disabled={disabled}
        />
        {emailState === "checking" && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking…
          </p>
        )}
        {emailState === "bad" && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-500">
            <AlertCircle className="h-3 w-3" /> A partner already uses this email
          </p>
        )}
        {emailState === "ok" && (
          <p className="text-[11px] text-muted-foreground">
            They&apos;ll sign in with this. A default password is set for them.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tv-phone">
          Phone number <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <div className="w-32 shrink-0">
            <SearchableSelect
              options={DIAL_OPTIONS}
              value={form.phoneCode}
              onChange={(dial) =>
                onChange({
                  phoneCode: dial,
                  // Re-clamp: the new country may allow fewer digits.
                  phone: sanitizePhone(form.phone, dial),
                })
              }
              placeholder="Code"
              searchPlaceholder="Country or code"
              disabled={disabled}
            />
          </div>
          <Input
            id="tv-phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) =>
              onChange({ phone: sanitizePhone(e.target.value, form.phoneCode) })
            }
            placeholder={"X".repeat(maxPhoneDigits(form.phoneCode))}
            disabled={disabled}
          />
        </div>
        {form.phone && !phoneOk && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-500">
            <AlertCircle className="h-3 w-3" /> That isn&apos;t a valid number for{" "}
            {form.phoneCode}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tv-country">
            Country <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            id="tv-country"
            options={COUNTRY_OPTIONS}
            value={form.country}
            onChange={(country) => {
              const info = getCountryByName(country);
              // Country drives the dial code and the currency symbol, exactly
              // like /get-started; both stay editable afterwards.
              onChange({
                country,
                currency: info?.currencySymbol || form.currency,
                phoneCode: info?.dial || form.phoneCode,
              });
            }}
            placeholder="Select a country"
            searchPlaceholder="Search countries"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tv-currency">
            Currency <span className="text-red-500">*</span>
          </Label>
          {/* The stored value is the SYMBOL (₹ / $), not the ISO code — that's
              what partners.currency holds everywhere in the app. */}
          <SearchableSelect
            id="tv-currency"
            options={CURRENCY_OPTIONS}
            value={form.currency}
            onChange={(currency) => onChange({ currency })}
            placeholder="Select a currency"
            searchPlaceholder="Search currencies"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
