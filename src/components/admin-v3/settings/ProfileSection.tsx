"use client";

import * as React from "react";
import { Crosshair, Map as MapIcon, MapPin, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";

import { MENU_LANGUAGES } from "@/lib/menuLanguages";
import { TIMEZONE_OPTIONS } from "@/lib/timezones";
import { CURRENCY_OPTIONS } from "@/lib/worldCurrencies";
import { cn } from "@/lib/utils";

import { AdminV3Button } from "../ui/primitives";
import { MapPickerPage, type PickedPlace } from "./MapPickerPage";
import {
  FieldRow,
  Note,
  NumberField,
  SelectField,
  SettingsCard,
  TextField,
  ToggleRow,
  parseJson,
  num,
  useSectionDraft,
} from "./controls";

/* --------------------------------------------------------------- the draft */

interface ProfileDraft {
  store_name: string;
  store_tagline: string;
  /** Legal entity behind the brand — shown on policy pages and gateway KYC. */
  official_name: string;
  phone: string;
  whatsapp: string;
  location: string;
  district: string;
  state: string;
  country: string;
  location_details: string;
  lat: number;
  lng: number;
  place_id: string;
  currency: string;
  timezone: string;
  languageSwitcher: boolean;
  menuLanguages: string[];
  instagram: string;
  facebook: string;
}

/** social_links is jsonb, but very old rows hold a bare Instagram URL string. */
function readSocial(raw: unknown): Record<string, any> {
  if (typeof raw === "string" && raw.trim() && !raw.trim().startsWith("{")) {
    return { instagram: raw.trim() };
  }
  return parseJson(raw);
}

function read(partner: any): ProfileDraft {
  const sf = parseJson(partner?.storefront_settings);
  const social = readSocial(partner?.social_links);
  const coords = partner?.geo_location?.coordinates;
  // The PRIMARY entry, not [0] — build() writes back to the "default" area, and
  // reading a different row would leave the field permanently "unsaved".
  const wa: Array<{ number?: string; area?: string }> = Array.isArray(
    partner?.whatsapp_numbers,
  )
    ? partner.whatsapp_numbers
    : [];
  const primaryWa = wa.find((w) => w?.area === "default") ?? wa[0];
  return {
    store_name: partner?.store_name || "",
    store_tagline: partner?.store_tagline || "",
    official_name: partner?.official_name || "",
    phone: partner?.phone || "",
    whatsapp: primaryWa?.number || partner?.phone || "",
    location: partner?.location || "",
    district: partner?.district || "",
    state: partner?.state || "",
    country: partner?.country || "",
    location_details: partner?.location_details || "",
    lat: num(Array.isArray(coords) ? coords[1] : 0),
    lng: num(Array.isArray(coords) ? coords[0] : 0),
    place_id: partner?.place_id || "",
    currency: partner?.currency || "",
    timezone: partner?.timezone || "Asia/Kolkata",
    languageSwitcher: !!sf?.languageSwitcher,
    menuLanguages: Array.isArray(sf?.menuLanguages) ? [...sf.menuLanguages] : [],
    instagram: social?.instagram || "",
    facebook: social?.facebook || "",
  };
}

function build(d: ProfileDraft, partner: any): Record<string, unknown> {
  // Preserve every other area/branch: delivery settings store per-area numbers
  // as whatsapp_numbers[{number, area}] and only the primary one is edited here.
  const existing: Array<{ number: string; area: string }> = Array.isArray(
    partner?.whatsapp_numbers,
  )
    ? partner.whatsapp_numbers
    : [];
  let whatsapp_numbers: Array<{ number: string; area: string }>;
  if (existing.length === 0) {
    whatsapp_numbers = [{ number: d.whatsapp, area: "default" }];
  } else {
    const di = existing.findIndex((w) => w?.area === "default");
    const target = di >= 0 ? di : 0;
    whatsapp_numbers = existing.map((w, i) =>
      i === target ? { ...w, number: d.whatsapp } : w,
    );
  }

  // Read-modify-write both blobs: other sections own other keys in them.
  const sf = parseJson(partner?.storefront_settings);
  const social = readSocial(partner?.social_links);

  const updates: Record<string, unknown> = {
    store_name: d.store_name,
    store_tagline: d.store_tagline || null,
    official_name: d.official_name || null,
    phone: d.phone,
    whatsapp_numbers,
    location: d.location,
    location_details: d.location_details,
    district: d.district,
    state: d.state,
    country: d.country,
    place_id: d.place_id || null,
    currency: d.currency || null,
    timezone: d.timezone,
    storefront_settings: JSON.stringify({
      ...sf,
      languageSwitcher: d.languageSwitcher,
      menuLanguages: d.menuLanguages,
    }),
    social_links: { ...social, instagram: d.instagram, facebook: d.facebook },
  };

  // Only send a pin we actually have — writing [0,0] would drop a store into
  // the Gulf of Guinea and break every distance-based delivery rule.
  if (Number.isFinite(d.lat) && Number.isFinite(d.lng) && !(d.lat === 0 && d.lng === 0)) {
    updates.geo_location = { type: "Point", coordinates: [d.lng, d.lat] };
  }
  return updates;
}

/* ------------------------------------------------------------------ screen */

export type ProfileTab = "details" | "address" | "region" | "social";

export const PROFILE_TABS: { value: ProfileTab; label: string }[] = [
  { value: "details", label: "Details" },
  { value: "address", label: "Address" },
  { value: "region", label: "Currency & Language" },
  { value: "social", label: "Social" },
];

export function ProfileSection({ tab }: { tab: ProfileTab }) {
  const { partner, draft, patch } = useSectionDraft(read, build, "Store profile saved");
  const [locating, setLocating] = React.useState(false);
  const [mapOpen, setMapOpen] = React.useState(false);

  // Leaving Address has to drop the map page, or switching to Details and back
  // reopens the map instead of the form the partner expected.
  React.useEffect(() => {
    if (tab !== "address" && mapOpen) setMapOpen(false);
  }, [tab, mapOpen]);

  /**
   * The picker only fills the form — the card's Save button still writes it.
   *
   * Address parts are written only when Google actually returned one, so
   * dropping a pin in a spot with a thin geocode does not wipe a City/State the
   * partner typed by hand.
   */
  const applyPickedPlace = (p: PickedPlace) => {
    patch({
      lat: Number(p.lat.toFixed(6)),
      lng: Number(p.lng.toFixed(6)),
      ...(p.address ? { location: p.address } : {}),
      ...(p.district ? { district: p.district } : {}),
      ...(p.state ? { state: p.state } : {}),
      ...(p.country ? { country: p.country } : {}),
      ...(p.placeId ? { place_id: p.placeId } : {}),
    });
    toast.success("Location set — press Save to apply it");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("This browser cannot share a location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        patch({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        toast.success("Pin moved to your current location — press Save");
      },
      () => {
        setLocating(false);
        toast.error("Could not read your location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const hasPin = !(draft.lat === 0 && draft.lng === 0);

  if (tab === "details") {
    return (
      <SettingsCard>
        <FieldRow>
          <TextField
            label="Store name"
            value={draft.store_name}
            onChange={(v) => patch({ store_name: v })}
            placeholder="Your store name"
            translateNo
            basis="100%"
          />
        </FieldRow>
        <FieldRow>
          <TextField
            label="Tagline"
            hint={`shown under the name · ${draft.store_tagline.length}/60`}
            value={draft.store_tagline}
            onChange={(v) => patch({ store_tagline: v.slice(0, 60) })}
            maxLength={60}
            placeholder={`Order your favourites from ${draft.store_name || "your store"}`}
            translateNo
            basis="100%"
          />
        </FieldRow>
        <FieldRow>
          {/* Moved off the old Payments → Legal tab. It is an identity field,
              not a payment one — policy pages and gateway KYC both read it. */}
          <TextField
            label="Registered name"
            hint="blank shows only your brand"
            value={draft.official_name}
            onChange={(v) => patch({ official_name: v })}
            placeholder="Registered legal entity"
            translateNo
            basis="100%"
          />
        </FieldRow>
        <FieldRow>
          <TextField
            label="Phone"
            value={draft.phone}
            onChange={(v) => patch({ phone: v })}
            placeholder="9876543210"
            inputMode="tel"
          />
          <TextField
            label="WhatsApp number"
            hint="orders and updates are sent from here"
            value={draft.whatsapp}
            onChange={(v) => patch({ whatsapp: v })}
            placeholder="9876543210"
            inputMode="tel"
          />
        </FieldRow>
      </SettingsCard>
    );
  }

  if (tab === "address" && mapOpen) {
    return (
      <MapPickerPage
        lat={draft.lat}
        lng={draft.lng}
        onBack={() => setMapOpen(false)}
        onPick={applyPickedPlace}
      />
    );
  }

  if (tab === "address") {
    return (
      <SettingsCard>
        <FieldRow>
          <TextField
            label="Street address"
            value={draft.location}
            onChange={(v) => patch({ location: v })}
            placeholder="Building, street, area"
            translateNo
            basis="100%"
          />
        </FieldRow>
        <FieldRow>
          <TextField
            label="City"
            value={draft.district}
            onChange={(v) => patch({ district: v })}
            translateNo
            basis="150px"
          />
          <TextField
            label="State"
            value={draft.state}
            onChange={(v) => patch({ state: v })}
            translateNo
            basis="150px"
          />
          <TextField
            label="Country"
            value={draft.country}
            onChange={(v) => patch({ country: v })}
            translateNo
            basis="150px"
          />
        </FieldRow>
        <FieldRow>
          <TextField
            label="Landmark"
            hint="optional"
            value={draft.location_details}
            onChange={(v) => patch({ location_details: v })}
            placeholder="Floor, building, near…"
            translateNo
            basis="100%"
          />
        </FieldRow>

        {/* `flex-1` here was `flex: 1 1 0%` — a zero basis, so on a phone the
            text shrank into a ~200px column beside the buttons and broke over
            five lines. A 260px basis makes it claim a row of its own once there
            is no room for both, and the buttons wrap underneath as a group
            rather than one straggling off on its own line. */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
          <div className="min-w-0 flex-[1_1_260px]">
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Map location
            </div>
            <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              {hasPin
                ? "Delivery distance and the customer's map link both use this pin."
                : "No pin set — delivery distance cannot be calculated."}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminV3Button
              variant="secondary"
              className="h-[34px] px-3 text-[13px]"
              onClick={() => setMapOpen(true)}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Set on map
            </AdminV3Button>
            <AdminV3Button
              variant="secondary"
              className="h-[34px] px-3 text-[13px]"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              <Crosshair className="h-3.5 w-3.5" />
              {locating ? "Locating…" : "Current location"}
            </AdminV3Button>
            {hasPin ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${draft.lat},${draft.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                Open map
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2.5 border-b border-zinc-100 px-3 py-[11px] dark:border-zinc-800">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <div className="min-w-0">
              <div
                translate="no"
                className="notranslate truncate text-[12.5px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
              >
                {partner?.store_name || "Your store"}
              </div>
              <div
                translate="no"
                className="notranslate mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500"
              >
                {[draft.location, draft.district, draft.state, draft.country]
                  .filter(Boolean)
                  .join(", ") || "No address saved yet"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 px-3 py-3">
            <NumberField
              label="Latitude"
              value={draft.lat}
              min={-90}
              max={90}
              onChange={(v) => patch({ lat: v })}
              basis="150px"
            />
            <NumberField
              label="Longitude"
              value={draft.lng}
              min={-180}
              max={180}
              onChange={(v) => patch({ lng: v })}
              basis="150px"
            />
          </div>
        </div>
        <Note>
          “Set on map” opens a searchable map you can drag the pin on. Nothing is
          written until you press Save.
        </Note>
      </SettingsCard>
    );
  }

  if (tab === "region") {
    return (
      <SettingsCard>
        <FieldRow>
          <SelectField
            label="Currency"
            hint="on menus, orders and bills"
            value={draft.currency}
            onChange={(v) => patch({ currency: v })}
            options={[
              { value: "", label: "Select a currency" },
              ...CURRENCY_OPTIONS.map((c) => ({
                value: c.value,
                label: `${c.label} (${c.hint})`,
              })),
            ]}
          />
          <SelectField
            label="Timezone"
            hint="used for hours and scheduling"
            value={draft.timezone}
            onChange={(v) => patch({ timezone: v })}
            options={TIMEZONE_OPTIONS.map((t) => ({
              value: t.value,
              label: `${t.label} · ${t.hint}`,
            }))}
          />
        </FieldRow>

        <ToggleRow
          title="Offer other languages"
          desc="Adds a language button to your menu so customers can read it in their own language."
          checked={draft.languageSwitcher}
          onChange={(v) => patch({ languageSwitcher: v })}
        />

        {draft.languageSwitcher ? (
          <div>
            <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              Languages offered
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MENU_LANGUAGES.filter((l) => l.code !== "en").map((l) => {
                const on = draft.menuLanguages.includes(l.code);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() =>
                      patch({
                        menuLanguages: on
                          ? draft.menuLanguages.filter((c) => c !== l.code)
                          : [...draft.menuLanguages, l.code],
                      })
                    }
                    className={cn(
                      "h-[30px] rounded-full border px-3 text-[12.5px] leading-none transition-colors",
                      on
                        ? "border-zinc-900 bg-zinc-900 font-medium text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                    )}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
              English is always available. Leave every language off to offer them all.
            </div>
          </div>
        ) : null}
      </SettingsCard>
    );
  }

  return (
    <SettingsCard>
      <FieldRow>
        <TextField
          label="Instagram"
          value={draft.instagram}
          onChange={(v) => patch({ instagram: v })}
          placeholder="https://instagram.com/…"
          type="url"
          inputMode="url"
        />
        <TextField
          label="Facebook"
          value={draft.facebook}
          onChange={(v) => patch({ facebook: v })}
          placeholder="https://facebook.com/…"
          type="url"
          inputMode="url"
        />
      </FieldRow>
      <Note>
        Zomato, Uber Eats, Talabat and DoorDash links live under Integrations —
        they sit with the rest of the platform connections.
      </Note>
    </SettingsCard>
  );
}
