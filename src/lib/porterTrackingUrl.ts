/**
 * Helpers for the porter-bridge integration. Decode tracking URL + driver
 * info out of the `delivery_provider_meta` jsonb column on orders.
 */

export interface PorterMeta {
  accountId?: string;
  porterBookingId?: string;
  fareAmount?: number;
  paymentMode?: string;
  shareText?: string | null;
  consignmentNotePdfUrl?: string | null;
  driver?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  };
  error?: string;
  // anything else the bridge persists
  [key: string]: unknown;
}

/** Pull the customer-facing tracking URL out of Porter's auto-generated
 *  shareText. Format: "...porter.in/rd/<code>...". */
export function extractTrackingUrl(
  shareText: string | undefined | null,
): string | null {
  if (!shareText) return null;
  const m = shareText.match(/porter\.in\/rd\/[a-z0-9]+/i);
  return m ? `https://${m[0]}` : null;
}

/** Map Porter's internal status string to a human-readable label + tone. */
export function porterStatusDisplay(
  state: string | null | undefined,
): { label: string; tone: "pending" | "active" | "done" | "error" } {
  switch ((state || "").toLowerCase()) {
    case "unallocated":
      return { label: "Finding rider", tone: "pending" };
    case "not_started":
      return { label: "Rider assigned", tone: "active" };
    case "started":
      return { label: "Rider on the way", tone: "active" };
    case "ended":
      return { label: "Delivered", tone: "done" };
    case "cancelled":
      return { label: "Cancelled", tone: "error" };
    case "failed":
      return { label: "Dispatch failed", tone: "error" };
    // Hybrid booking: no rider was booked because this drop is past the store's
    // third-party radius. Which of the two it is comes from the partner's setting,
    // and the raw state string ("own_delivery") was previously shown as-is.
    case "own_delivery":
      return { label: "You deliver this one", tone: "active" };
    case "shiprocket":
      return { label: "Shipping with Shiprocket", tone: "active" };
    default:
      return { label: state || "Pending dispatch", tone: "pending" };
  }
}

/** True if the booking is in a non-terminal state and worth polling. */
export function isPorterLive(state: string | null | undefined): boolean {
  const s = (state || "").toLowerCase();
  return (
    s === "unallocated" ||
    s === "not_started" ||
    s === "started" ||
    s === "pending"
  );
}
