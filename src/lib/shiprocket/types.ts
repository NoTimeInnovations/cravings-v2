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
   * Pin a courier by Shiprocket's courier_company_id. null = let Shiprocket pick
   * its recommended courier, which is what almost every store wants.
   */
  courier_id: number | null;
  /** Sales channel id. Blank = Shiprocket's default "Custom" channel. */
  channel_id: string | null;
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
  courier_id: null,
  channel_id: null,
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
    courier_id: Number.isFinite(courierId) && courierId > 0 ? courierId : null,
    channel_id:
      typeof obj.channel_id === "string" && obj.channel_id.trim() ? obj.channel_id.trim() : null,
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
 */
export type ShipmentStatus =
  | "claimed"
  | "created"
  | "awb_assigned"
  | "pickup_requested"
  | "failed"
  | "unknown"
  | "cancelled";

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
  address: string | null;
  /** Shiprocket will not pick up from a location whose phone is unverified. */
  phoneVerified: boolean;
}
