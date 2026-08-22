import { getPartnerMapsUrl } from "@/lib/getPartnerMapsUrl";

/**
 * Self-arranged courier — the customer books their own Porter/Uber/Rapido
 * parcel to collect an order, and we record that they said so.
 *
 * The single vocabulary shared by the customer panel, both dashboards, both
 * settings screens and the server action. Deliberately NOT "use server": that
 * file kind requires every export to be async, and most of this is constants
 * and pure functions.
 *
 * We are not the carrier. Nothing here books, prices, tracks or cancels
 * anything — it formats what a courier app's booking form asks for and stores
 * what the customer tells us afterwards.
 */

/** The value written to orders.delivery_provider. A CHANNEL, never a brand:
 *  src/app/actions/deliveryCharges.ts filters on the brand names and bills them
 *  to the partner's 3rd-party charges report, and this fare is the customer's. */
export const SELF_COURIER_PROVIDER = "customer_self";

export type SelfCourierStage = "offered" | "booked" | "cancelled" | "no_show";

/** orders.delivery_provider_state. Never the literal "failed" — admin-v2's
 *  OrderDetails renders "no third-party rider available, deliver it yourself"
 *  on that string for ANY provider. */
export type SelfCourierState = "self_booked" | "self_cancelled" | "self_no_show";

export const SELF_COURIER_STATE: Record<
  Exclude<SelfCourierStage, "offered">,
  SelfCourierState
> = {
  booked: "self_booked",
  cancelled: "self_cancelled",
  no_show: "self_no_show",
};

/** Kept short so one runaway order cannot grow the jsonb without bound. */
export const MAX_SELF_COURIER_EVENTS = 8;

export type SelfCourierBrandSlug = "uber" | "porter" | "rapido" | "other";

export interface SelfCourierEvent {
  at: string;
  stage: SelfCourierStage;
  by: "customer" | "partner";
  provider?: SelfCourierBrandSlug | null;
}

export interface SelfCourierRecord {
  v: 1;
  stage: SelfCourierStage;
  provider: SelfCourierBrandSlug | null;
  providerLabel: string | null;
  riderName: string | null;
  riderPhone: string | null;
  reference: string | null;
  arrangedBy: string;
  arrangedAt: string;
  notified?: { pushed: boolean; recipients: number } | null;
  events?: SelfCourierEvent[];
}

/* ------------------------------------------------------------------ brands */

export interface SelfCourierBrand {
  slug: SelfCourierBrandSlug;
  label: string;
  subtitle: string;
  /** A single destination, when it is the same on every platform. */
  href?: string;
  /** Per-platform store links, when there is no working universal link. */
  storeHrefs?: { ios: string; android: string };
  hint: string;
}

/**
 * Labels are DATA, not code.
 *
 * Uber's Indian product is no longer branded "Uber Connect" — its own flow says
 * "select Parcel" — and after the June 2025 Karnataka bike-taxi order the
 * aggregators relabelled two-wheeler work as goods movement. When a name
 * changes again this should be an edit here, not a hunt through JSX.
 */
export const SELF_COURIER_BRANDS: SelfCourierBrand[] = [
  {
    slug: "uber",
    label: "Uber",
    subtitle: "Parcel",
    // First because it books in a mobile browser with no app install at all —
    // the only one of the three that works for someone on a desktop.
    href: "https://m.uber.com/go/connect/home",
    hint: "Choose Receive or Store pickup — not Send, or it collects from your address.",
  },
  {
    slug: "porter",
    label: "Porter",
    subtitle: "Two-Wheeler",
    // A genuine universal link, declared in Porter's AASA. Opens the app when
    // installed and redirects to the right store when not, on both platforms —
    // so no user-agent sniffing.
    href: "https://porter.in/customerapplinks/",
    hint: "Choose Two-Wheeler.",
  },
  {
    slug: "rapido",
    label: "Rapido",
    subtitle: "Parcel",
    // Official stores only. NEVER rapido.app.link — it is not Rapido India's
    // domain and redirects to an unrelated App Store id on iOS.
    storeHrefs: {
      ios: "https://apps.apple.com/in/app/id1198464606",
      android: "https://play.google.com/store/apps/details?id=com.rapido.passenger",
    },
    hint: "Look for the Parcel tile — not every city has it.",
  },
  {
    slug: "other",
    label: "Another courier",
    subtitle: "",
    hint: "",
  },
];

export const brandBySlug = (slug?: string | null): SelfCourierBrand | null =>
  SELF_COURIER_BRANDS.find((b) => b.slug === slug) ?? null;

export const brandLabel = (slug?: string | null): string =>
  brandBySlug(slug)?.label ?? "a courier";

/* -------------------------------------------------------------- json shapes */

const asObject = (raw: unknown): Record<string, unknown> | null => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  // Every JSON column on these tables can arrive stringified — the house rule.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
};

/** Read the record out of orders.delivery_provider_meta. */
export function parseSelfCourier(meta: unknown): SelfCourierRecord | null {
  const obj = asObject(meta);
  const rec = asObject(obj?.selfCourier);
  if (!rec) return null;
  const stage = rec.stage;
  if (
    stage !== "offered" &&
    stage !== "booked" &&
    stage !== "cancelled" &&
    stage !== "no_show"
  ) {
    return null;
  }
  return {
    v: 1,
    stage,
    provider: (rec.provider as SelfCourierBrandSlug) ?? null,
    providerLabel: (rec.providerLabel as string) ?? null,
    riderName: (rec.riderName as string) ?? null,
    riderPhone: (rec.riderPhone as string) ?? null,
    reference: (rec.reference as string) ?? null,
    arrangedBy: (rec.arrangedBy as string) ?? "guest",
    arrangedAt: (rec.arrangedAt as string) ?? "",
    notified: (rec.notified as SelfCourierRecord["notified"]) ?? null,
    events: Array.isArray(rec.events) ? (rec.events as SelfCourierEvent[]) : [],
  };
}

/** A record the partner should SEE — "offered" is an invitation nobody acted on. */
export function hasSelfCourierRecord(order: {
  delivery_provider_meta?: unknown;
}): boolean {
  const r = parseSelfCourier(order?.delivery_provider_meta);
  return !!r && r.stage !== "offered";
}

/** "Pickup: Porter" — the dashboard pill. */
export function selfCourierPillLabel(order: {
  delivery_provider_meta?: unknown;
}): string | null {
  const r = parseSelfCourier(order?.delivery_provider_meta);
  if (!r || r.stage === "offered") return null;
  if (r.stage === "cancelled") return "Pickup cancelled";
  if (r.stage === "no_show") return "Courier didn't arrive";
  return `Pickup: ${r.providerLabel || brandLabel(r.provider)}`;
}

/* ----------------------------------------------------------------- fairness */

/**
 * Did the customer already pay this restaurant to deliver?
 *
 * Broad on purpose: production carries "PARCEL&DELIVERY", "DELIVERY AND
 * PARCEL", "parcel & delivery" and "DELIVERY(parcel charge)" among others, and
 * asking someone to pay a courier on top of a delivery fee they already paid is
 * the one thing this feature must never do.
 */
export function hasDeliveryFee(
  extraCharges: Array<{ name?: string | null; amount?: number | string | null }> | null | undefined,
): boolean {
  for (const c of extraCharges ?? []) {
    const name = String(c?.name ?? "").toLowerCase();
    if (name.includes("delivery") && Number(c?.amount) > 0) return true;
  }
  return false;
}

/**
 * Would offering a courier ask this customer to pay for delivery twice?
 *
 * Only meaningful on a REAL delivery order. On a takeaway there was never a
 * delivery to pay for, so a "delivery"-named line there is a mislabelled
 * PACKING charge — 2,168 of the 9,154 takeaway orders in production carry one,
 * most of them named "PARCEL&DELIVERY". Running the fee test over those would
 * silently withhold the feature from a quarter of the orders it exists for,
 * which is why the gate must ask this question and not hasDeliveryFee directly.
 */
export function wouldChargeTwiceForDelivery(order: {
  type?: string | null;
  deliveryAddress?: string | null;
  delivery_address?: string | null;
  extra_charges?: Array<{ name?: string | null; amount?: number | string | null }> | null;
  extraCharges?: Array<{ name?: string | null; amount?: number | string | null }> | null;
}): boolean {
  if (isTakeawayOrder(order)) return false;
  return hasDeliveryFee(order?.extra_charges ?? order?.extraCharges ?? null);
}

/**
 * A takeaway order: stored as type "delivery" with no drop address.
 *
 * The exact inverse of isRealDeliveryOrder in src/lib/ownDriverDispatch.ts.
 * Do not mint a third variant — the looser one on the order page disagrees on
 * empty-string addresses.
 */
export function isTakeawayOrder(order: {
  type?: string | null;
  deliveryAddress?: string | null;
  delivery_address?: string | null;
}): boolean {
  const addr = order?.deliveryAddress ?? order?.delivery_address ?? null;
  return order?.type === "delivery" && !addr?.trim();
}

/** "#142" — what the customer quotes at the counter. Identical to the
 *  orderNumber() both dashboards already show, so the two never disagree. */
export function orderHandoverRef(order: {
  display_id?: string | number | null;
  id?: string | null;
}): string {
  return Number(order?.display_id) > 0
    ? `#${order.display_id}`
    : `#${String(order?.id ?? "").slice(0, 6)}`;
}

/* ------------------------------------------------------------- partner opt-in */

export interface SelfCourierRules {
  enabled: boolean;
  types: "takeaway" | "both";
  providers: SelfCourierBrandSlug[];
}

export const DEFAULT_SELF_COURIER_RULES: SelfCourierRules = {
  // OFF until a partner asks for it. This sends their customer to a third party
  // and puts a stranger at their counter; it is not a sensible default.
  enabled: false,
  types: "takeaway",
  providers: ["uber", "porter", "rapido", "other"],
};

/** partners.delivery_rules.self_courier, object-or-string safe. */
export function readSelfCourierRules(partner: {
  delivery_rules?: unknown;
}): SelfCourierRules {
  const rules = asObject(partner?.delivery_rules);
  const sc = asObject(rules?.self_courier);
  if (!sc) return DEFAULT_SELF_COURIER_RULES;
  const providers = Array.isArray(sc.providers)
    ? (sc.providers as string[]).filter((p): p is SelfCourierBrandSlug =>
        SELF_COURIER_BRANDS.some((b) => b.slug === p),
      )
    : DEFAULT_SELF_COURIER_RULES.providers;
  return {
    enabled: sc.enabled === true,
    types: sc.types === "both" ? "both" : "takeaway",
    providers: providers.length ? providers : DEFAULT_SELF_COURIER_RULES.providers,
  };
}

/* --------------------------------------------------------------- the pickup */

export interface PickupPayload {
  /** Display lines for the panel, already filtered. */
  lines: { label: string; value: string }[];
  /** One paste-ready block — courier apps ask for address AND sender contact. */
  copyText: string;
  mapsUrl: string | null;
  /** False when we could not produce anything a courier app could resolve. */
  usableAddress: boolean;
}

/**
 * A free-text `location` is only worth showing if it looks like an address.
 *
 * Production holds Google short-links, bare city names and empty strings in
 * that column. A courier app fed "Kozhikode" sends a rider to the middle of a
 * city; fed a maps.app.goo.gl URL it fails outright.
 */
function usableLocationLine(location?: string | null): string | null {
  const s = (location ?? "").trim();
  if (!s) return null;
  if (/^https?:/i.test(s)) return null;
  if (s.length < 12) return null;
  if (!/[,\d]/.test(s)) return null;
  return s;
}

export function buildPickupPayload({
  partner,
  order,
}: {
  partner: {
    store_name?: string | null;
    location?: string | null;
    location_details?: string | null;
    district?: string | null;
    place_id?: string | null;
    phone?: string | null;
    country_code?: string | null;
    geo_location?: unknown;
  } | null | undefined;
  order: { display_id?: string | number | null; id?: string | null };
}): PickupPayload {
  const storeName = (partner?.store_name ?? "").trim();
  const lines: { label: string; value: string }[] = [];

  if (storeName) lines.push({ label: "Pickup from", value: storeName });

  const street = usableLocationLine(partner?.location);
  if (street) lines.push({ label: "Address", value: street });

  const details = (partner?.location_details ?? "").trim();
  if (details) lines.push({ label: "Landmark", value: details });

  // GeoJSON is [lng, lat]. Swapping them sends the rider to another country.
  const geo = asObject(partner?.geo_location);
  const coords = Array.isArray(geo?.coordinates) ? (geo.coordinates as number[]) : null;
  const lat = coords && typeof coords[1] === "number" ? coords[1] : null;
  const lng = coords && typeof coords[0] === "number" ? coords[0] : null;
  const latLng = lat != null && lng != null ? `${lat},${lng}` : null;
  // The field that actually works: courier apps run Places autocomplete, which
  // resolves a pasted coordinate pair even when it cannot parse the address.
  if (latLng) lines.push({ label: "Coordinates", value: latLng });

  const phone = (partner?.phone ?? "").trim();
  const dialCode = (partner?.country_code ?? "").trim();
  const fullPhone = phone ? `${dialCode}${phone}` : null;
  if (fullPhone) lines.push({ label: "Phone", value: fullPhone });

  const ref = orderHandoverRef(order);
  lines.push({ label: "Tell the counter", value: `order ${ref}` });

  const mapsUrl = getPartnerMapsUrl({
    store_name: partner?.store_name ?? null,
    place_id: partner?.place_id ?? null,
    geo_location: partner?.geo_location as never,
    location_details: partner?.location_details ?? null,
    district: partner?.district ?? null,
    location: partner?.location ?? null,
  });

  const copyText = [
    storeName ? `Pickup: ${storeName}` : null,
    street,
    details,
    latLng,
    fullPhone ? `Phone: ${fullPhone}` : null,
    `Order: ${ref}`,
    mapsUrl ? `Map: ${mapsUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    lines,
    copyText,
    mapsUrl,
    // Coordinates or a real street line — a name alone is not something a
    // courier app can route to.
    usableAddress: !!latLng || !!street,
  };
}

/* ------------------------------------------------------- settings copy ---- */

/**
 * The partner-facing setting, worded once.
 *
 * admin-v2 and admin-v3 both render this toggle, and 1,086 of 1,087 partners
 * are on v2 today while every partner created from 22 Aug lands on v3 — so both
 * screens are live and must say the same thing. Two hand-typed copies is how
 * the two dashboards drift.
 */
export const SELF_COURIER_SETTING = {
  title: "Let customers book their own courier",
  description:
    "Shows pickup customers a panel with your address and links to Uber Parcel, Porter and Rapido. They book and pay the courier themselves. You'll get a push when they do, and the order will show a courier is coming — you still hand the bag over. Menuthere doesn't book or track it.",
  typesLabel: "Offer it on",
  typeOptions: [
    { value: "takeaway" as const, label: "Pickup orders only" },
    { value: "both" as const, label: "Pickup, and delivery when you can't deliver" },
  ],
  providersLabel: "Courier apps to show",
  /** Porter publishes 22 Indian cities; Uber publishes none and Rapido Parcel
   *  has no public city list at all — so someone who knows the city picks. */
  providersHint:
    "Only show apps that actually operate in your city. Rapido Parcel in particular is not available everywhere.",
} as const;
