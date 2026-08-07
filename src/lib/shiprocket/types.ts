// Shiprocket config + shipment types. Isomorphic on purpose — the settings UI
// imports the parser and the defaults, so nothing in here may touch Node crypto,
// Hasura or process.env. The secrets live next door in creds.ts (server-only).

/**
 * Which Shiprocket product a store ships with.
 *
 * "parcel"     — the standard courier network. Serviceability is quoted from
 *                pincode + weight, and every order MUST carry weight and
 *                L/B/H, so the settings panel collects package defaults.
 * "hyperlocal" — Shiprocket Quick, same-city rider. Quoted from pickup/drop
 *                coordinates (`is_new_hyperlocal=1`), returns a much flatter
 *                serviceability response, and ignores dimensions.
 *
 * Both go through the SAME endpoints; the payload and the response parser differ.
 */
export type ShiprocketMode = "parcel" | "hyperlocal";

/** Order status that auto-dispatch fires on. Mirrors porter_dispatch_trigger. */
export type ShiprocketTrigger = "accepted" | "food_ready" | "dispatched";

/**
 * What is in the bag, for Shiprocket Quick (hyperlocal) only.
 *
 * REQUIRED by the hyperlocal order-create: omitting it is not treated as "no
 * preference", it is rejected outright with "Invalid category selected for
 * hyperlocal shipment" — an error that reads like a bad value but is what a
 * MISSING field produces. Parcel mode neither needs nor accepts it.
 *
 * Sent as `category_name` on every order_items entry, NOT on the order. All of
 * this was established against the live API, because Shiprocket's published docs
 * do not mention the field at all: a top-level `category_name` is rejected
 * identically to sending nothing, and the value is case-sensitive ("Food" passes,
 * "food" does not). Do not "tidy" the casing.
 */
export const HYPERLOCAL_CATEGORIES = [
  "Food",
  "Groceries",
  "Medicines",
  "Electronics",
  "Clothes",
  "Documents",
  "Loose Goods",
  "Others",
] as const;

export type ShiprocketCategory = (typeof HYPERLOCAL_CATEGORIES)[number];

export interface ShiprocketPackage {
  /** cm. Shiprocket rejects anything <= 0.5. */
  length: number;
  breadth: number;
  height: number;
  /** kg. Shiprocket rejects <= 0. */
  weight: number;
}

export interface ShiprocketConfig {
  mode: ShiprocketMode;
  /**
   * The pickup location NICKNAME as Shiprocket knows it. Chosen from the list the
   * connection test fetches — never free text, because an unrecognised nickname
   * fails every order-create with a message that does not say so.
   */
  pickup_location: string;
  /** Auto-dispatch on the trigger status. Off = the manual Ship button only. */
  auto_dispatch: boolean;
  dispatch_trigger: ShiprocketTrigger;
  /** Ask Shiprocket to schedule a pickup right after the AWB is assigned. */
  request_pickup: boolean;
  /**
   * Charge the customer what Shiprocket quotes, instead of the store's own
   * distance-based delivery_rules pricing.
   *
   * Off is a real choice, not a fallback: Shiprocket's rate is what the SHIPMENT
   * costs, which on a small food order can be most of the basket, and a store may
   * well prefer a flat ₹40 and absorb the rest. Mirrors porter_pricing_mode.
   */
  use_shiprocket_charge: boolean;
  /**
   * Pin a courier by Shiprocket's courier_company_id. null = let Shiprocket pick
   * its recommended courier, which is what almost every store wants.
   */
  courier_id: number | null;
  /** Sales channel id. Blank = Shiprocket's default "Custom" channel. */
  channel_id: string | null;
  /**
   * PIN code of the chosen pickup location, cached from Shiprocket when it is
   * first needed. Rate quotes are priced from pickup PIN → delivery PIN, and a
   * customer waiting at checkout should not pay for a round trip to Shiprocket to
   * re-read an address that changes about once a year.
   */
  pickup_pincode: string | null;
  /**
   * Coordinates of that same pickup location, as SHIPROCKET holds them.
   *
   * Not the partner's geo_location: the two genuinely disagree — the store this
   * was built against sits in Bangalore on the partners row and ships from a
   * Kerala pickup address — and a hyperlocal quote priced from the wrong city is
   * wrong by hundreds of kilometres, silently.
   */
  pickup_lat: number | null;
  pickup_lng: number | null;
  /**
   * This store's own webhook token. It is the LAST path segment of the URL the
   * merchant pastes into Shiprocket, and it is how an inbound event is attributed
   * to a partner — Shiprocket sends nothing that identifies the account, so
   * without a per-store token any merchant's events could touch any other
   * merchant's orders. Generated for them; never typed by hand.
   */
  webhook_token: string | null;
  /**
   * What is in the bag. Sent as `category_name` on each line item of a hyperlocal
   * order, where it is mandatory. Ignored in parcel mode.
   */
  category: ShiprocketCategory;
  /** Default box, used for parcel mode when an order carries no size of its own. */
  package: ShiprocketPackage;
}

/** A box that Shiprocket will actually accept, and a weight that is not a lie. */
export const DEFAULT_SHIPROCKET_PACKAGE: ShiprocketPackage = {
  length: 15,
  breadth: 15,
  height: 10,
  weight: 0.5,
};

export const DEFAULT_SHIPROCKET_CONFIG: ShiprocketConfig = {
  mode: "parcel",
  pickup_location: "",
  // Default OFF. Every dispatch spends the partner's own Shiprocket wallet and
  // burns an order reference that can never be reused, so shipping starts only
  // once someone has deliberately asked for it.
  auto_dispatch: false,
  dispatch_trigger: "accepted",
  request_pickup: true,
  // On by default: a store that turned shipping on is paying these rates, so
  // billing them through is the less surprising of the two defaults.
  use_shiprocket_charge: true,
  courier_id: null,
  channel_id: null,
  pickup_pincode: null,
  pickup_lat: null,
  pickup_lng: null,
  // Minted server-side on first save — see ensureShiprocketWebhookToken.
  webhook_token: null,
  // Most stores on this platform sell prepared food; a store shipping something
  // else picks its own in the settings panel.
  category: "Food",
  package: { ...DEFAULT_SHIPROCKET_PACKAGE },
};

const MODES: ShiprocketMode[] = ["parcel", "hyperlocal"];
const TRIGGERS: ShiprocketTrigger[] = ["accepted", "food_ready", "dispatched"];

function num(v: unknown, fallback: number, min: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

/**
 * Parse whatever is in the `config` column into a complete config.
 *
 * Tolerates a JSON string as well as an object: jsonb columns in this codebase
 * come back either way depending on which client wrote them, and a settings
 * screen that throws on read is worse than one that shows defaults.
 */
export function parseShiprocketConfig(raw: unknown): ShiprocketConfig {
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj !== "object") return { ...DEFAULT_SHIPROCKET_CONFIG, package: { ...DEFAULT_SHIPROCKET_PACKAGE } };

  const pkg = (obj.package && typeof obj.package === "object" ? obj.package : {}) as Record<string, unknown>;
  const courierId = Number(obj.courier_id);

  return {
    mode: MODES.includes(obj.mode) ? obj.mode : DEFAULT_SHIPROCKET_CONFIG.mode,
    pickup_location: typeof obj.pickup_location === "string" ? obj.pickup_location.trim() : "",
    auto_dispatch: obj.auto_dispatch === true,
    dispatch_trigger: TRIGGERS.includes(obj.dispatch_trigger)
      ? obj.dispatch_trigger
      : DEFAULT_SHIPROCKET_CONFIG.dispatch_trigger,
    // Absent means "yes" — scheduling the pickup is the useful default and older
    // rows predate the field.
    request_pickup: obj.request_pickup !== false,
    // Absent means yes — same reason as request_pickup: rows written before the
    // field existed were all quoting Shiprocket's rate.
    use_shiprocket_charge: obj.use_shiprocket_charge !== false,
    courier_id: Number.isFinite(courierId) && courierId > 0 ? courierId : null,
    channel_id:
      typeof obj.channel_id === "string" && obj.channel_id.trim() ? obj.channel_id.trim() : null,
    pickup_pincode:
      typeof obj.pickup_pincode === "string" && /^[1-9]\d{5}$/.test(obj.pickup_pincode.trim())
        ? obj.pickup_pincode.trim()
        : null,
    pickup_lat: Number.isFinite(Number(obj.pickup_lat)) ? Number(obj.pickup_lat) : null,
    pickup_lng: Number.isFinite(Number(obj.pickup_lng)) ? Number(obj.pickup_lng) : null,
    webhook_token:
      typeof obj.webhook_token === "string" && obj.webhook_token.trim()
        ? obj.webhook_token.trim()
        : null,
    // Falls back rather than passing an unrecognised value through: Shiprocket
    // rejects the whole order over this field, so a stale or hand-edited config
    // should still ship as Food instead of failing at the counter.
    category: (HYPERLOCAL_CATEGORIES as readonly string[]).includes(obj.category)
      ? obj.category
      : DEFAULT_SHIPROCKET_CONFIG.category,
    package: {
      // Shiprocket's floor is 0.5cm / 0kg; clamp to something a courier will accept
      // rather than letting a 0 through to be rejected at order-create time.
      length: num(pkg.length, DEFAULT_SHIPROCKET_PACKAGE.length, 0.6),
      breadth: num(pkg.breadth, DEFAULT_SHIPROCKET_PACKAGE.breadth, 0.6),
      height: num(pkg.height, DEFAULT_SHIPROCKET_PACKAGE.height, 0.6),
      weight: num(pkg.weight, DEFAULT_SHIPROCKET_PACKAGE.weight, 0.01),
    },
  };
}

/**
 * Lifecycle of a shiprocket_shipments row.
 *
 *  claimed          — the send is in flight. Holding this blocks every other caller.
 *  created          — the order exists at Shiprocket but has no courier/AWB yet.
 *  awb_assigned     — a courier is booked. The parcel is real from here on.
 *  pickup_requested — collection scheduled on top of the AWB.
 *  failed           — the send was REJECTED. Nothing exists upstream, so retrying
 *                     is safe.
 *  unknown          — we do not know whether Shiprocket accepted it (timeout, 5xx,
 *                     or a claim that never finished). Deliberately distinct from
 *                     `failed`: an automatic retry here could create a SECOND real
 *                     parcel under a new reference, which Shiprocket cannot dedupe.
 *                     Only a human pressing the button may retry this.
 *  cancelled        — cancelled locally. Never auto-retried, for the same reason.
 *
 * The states below arrive ONLY from the Shiprocket webhook, never from a dispatch
 * call. They are the parcel's life after we stop talking to it, so nothing in the
 * claim logic may re-send from any of them.
 *
 *  in_transit       — collected, moving. (Shiprocket "PICKED UP" / "IN TRANSIT".)
 *  out_for_delivery — with the rider for the final hop.
 *  delivered        — done.
 *  rto              — coming back to the store: refused, unreachable, or expired.
 */
export type ShipmentStatus =
  | "claimed"
  | "created"
  | "awb_assigned"
  | "pickup_requested"
  | "failed"
  | "unknown"
  | "cancelled"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "rto";

/**
 * Shipment states that mean a parcel is real and in the world. Re-shipping any of
 * them would book and bill a SECOND one, so the Ship button must stay disabled —
 * this is the list the order panel asks, and new live states must be added here or
 * a delivered parcel quietly becomes re-shippable.
 */
export const LIVE_SHIPMENT_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  "awb_assigned",
  "pickup_requested",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "rto",
]);

/** A shipment as the admin UI sees it. No secrets — safe to send to the browser. */
export interface ShipmentView {
  orderId: string;
  mode: ShiprocketMode | null;
  status: ShipmentStatus;
  srOrderRef: string | null;
  srOrderId: string | null;
  shipmentId: string | null;
  awbCode: string | null;
  courierName: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
  attempt: number;
  lastError: string | null;
  updatedAt: string | null;
}

/** A pickup location as returned by /settings/company/pickup. */
export interface ShiprocketPickupLocation {
  nickname: string;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  /** Where Shiprocket thinks this pickup is — see pickup_lat on the config. */
  lat: number | null;
  lng: number | null;
  address: string | null;
  /** Shiprocket will not pick up from a location whose phone is unverified. */
  phoneVerified: boolean;
}
