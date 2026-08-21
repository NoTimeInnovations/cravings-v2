// Bill printing "layout" configuration — the partner-level choices that used to
// live only in the desktop print app's local Printer Settings window, now stored
// server-side in partners.delivery_rules so they can be set from the dashboard
// (Settings → Store → Bill Printing) and applied everywhere:
//   - the web /bill (and /kot) print pages render them, and
//   - the desktop app reads them from the print payload those pages log.
//
// delivery_rules is sometimes stored as a stringified JSON blob, so tolerate both
// object and string forms (same pattern as taxLabel.ts / billItemName.ts).

export type BillLayout = "default" | "invoice" | "uae";

// Keep in sync with the desktop app's VALID_BILL_LAYOUTS (main.js).
export const BILL_LAYOUTS: BillLayout[] = ["default", "invoice", "uae"];

function parseDeliveryRules(deliveryRules: any): any {
  if (!deliveryRules) return null;
  if (typeof deliveryRules === "string") {
    try {
      return JSON.parse(deliveryRules);
    } catch {
      return null;
    }
  }
  return deliveryRules;
}

/**
 * The bill layout a partner has chosen (partners.delivery_rules.bill_layout):
 *   - "default" — the standard Cravings/Menuthere receipt
 *   - "invoice" — bilingual ZATCA "Simplified Tax Invoice"
 *   - "uae"     — UAE FTA simplified tax invoice (VAT/Net labels always bilingual)
 * Falls back to "default" for anything unset/unknown.
 */
export function getBillLayout(deliveryRules: any): BillLayout {
  const l = parseDeliveryRules(deliveryRules)?.bill_layout;
  return BILL_LAYOUTS.includes(l) ? (l as BillLayout) : "default";
}

/**
 * Whether the "Full Arabic" print option is on
 * (partners.delivery_rules.bill_full_arabic). When on, the static bill/KOT labels
 * (Tel, Order, Date, Time, Subtotal, Total, Thank you…) print in Arabic and the
 * invoice layouts show bilingual labels.
 */
export function isFullArabic(deliveryRules: any): boolean {
  return !!parseDeliveryRules(deliveryRules)?.bill_full_arabic;
}

/**
 * Whether to print a "bill detail" QR on the bill
 * (partners.delivery_rules.bill_show_detail_qr). When on, the standard bill
 * footer shows a QR the customer can scan to open the order online
 * (menuthere.com/order/<id>) — rendered on the /bill page and printed via an
 * ESC/POS QR command by the desktop app's text path.
 */
export function isBillDetailQrEnabled(deliveryRules: any): boolean {
  return !!parseDeliveryRules(deliveryRules)?.bill_show_detail_qr;
}

/**
 * Whether to print the store logo at the top of the bill
 * (partners.delivery_rules.bill_show_logo). Only shown when a logo has actually
 * been uploaded (getBillLogoUrl is non-empty).
 */
export function isBillLogoEnabled(deliveryRules: any): boolean {
  return !!parseDeliveryRules(deliveryRules)?.bill_show_logo;
}

/**
 * Whether to print the assigned delivery rider's name and phone on the bill
 * (partners.delivery_rules.bill_show_delivery_boy). Off by default: most
 * partners do not want the rider's personal number on the customer's copy.
 *
 * Only meaningful on an order that actually has a rider assigned — the /bill
 * page omits the block entirely when there is none, so consumers of the print
 * payload can simply print what they are given.
 */
export function isBillDeliveryBoyEnabled(deliveryRules: any): boolean {
  return !!parseDeliveryRules(deliveryRules)?.bill_show_delivery_boy;
}

/**
 * The uploaded bill-logo image URL (partners.delivery_rules.bill_logo_url), or
 * null when none has been set.
 */
export function getBillLogoUrl(deliveryRules: any): string | null {
  const url = parseDeliveryRules(deliveryRules)?.bill_logo_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/**
 * Auto-print: open the bill automatically when an order reaches a chosen status
 * (partners.delivery_rules.bill_auto_print_enabled / bill_auto_print_status).
 *
 * Two fields rather than one nullable status, so switching the feature off and
 * on again does not forget which status the partner had picked.
 */
export function isBillAutoPrintEnabled(deliveryRules: any): boolean {
  return !!parseDeliveryRules(deliveryRules)?.bill_auto_print_enabled;
}

/** Statuses a bill can auto-print on. Deliberately excludes "cancelled" — a
 *  cancelled order has nothing to bill, and printing one wastes paper on the
 *  busiest possible moment. */
export const BILL_AUTO_PRINT_STATUSES: { value: string; label: string }[] = [
  { value: "accepted", label: "Accepted" },
  { value: "food_ready", label: "Food ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "completed", label: "Completed" },
];

export const DEFAULT_BILL_AUTO_PRINT_STATUS = "completed";

/**
 * Which status triggers the auto-print. Falls back to "completed" — the common
 * case — and refuses a value not in the list above, so a hand-edited or stale
 * delivery_rules cannot arm the trigger on something unexpected (e.g.
 * "cancelled").
 */
export function getBillAutoPrintStatus(deliveryRules: any): string {
  const v = parseDeliveryRules(deliveryRules)?.bill_auto_print_status;
  return BILL_AUTO_PRINT_STATUSES.some((s) => s.value === v)
    ? (v as string)
    : DEFAULT_BILL_AUTO_PRINT_STATUS;
}

/* ------------------------------------------------------------------------ *
 * Which documents auto-print, and on which status each one fires.
 *
 * The KOT and the bill are separate print jobs on purpose (see printOrder.ts):
 * they usually go to different printers, and they are wanted at different
 * moments — the kitchen ticket the second the order is taken, the receipt when
 * it is handed over. So "print both" is a choice of documents, not a choice of
 * one bigger document, and each document carries its own trigger status.
 * ------------------------------------------------------------------------ */

/** The two printable documents. Mirrors PrintDoc in src/lib/printOrder.ts. */
export type AutoPrintDoc = "kot" | "bill";

/** Kitchen first — the KOT is the one somebody is actually waiting on. */
const AUTO_PRINT_DOC_ORDER: AutoPrintDoc[] = ["kot", "bill"];

/** What the picker offers. "both" is stored as the two-element array. */
export type AutoPrintDocMode = "bill" | "kot" | "both";

export const BILL_AUTO_PRINT_DOC_OPTIONS: { value: AutoPrintDocMode; label: string }[] = [
  { value: "bill", label: "Bill only" },
  { value: "kot", label: "KOT only" },
  { value: "both", label: "Bill + KOT" },
];

export function autoPrintDocsToMode(docs: AutoPrintDoc[]): AutoPrintDocMode {
  if (docs.length > 1) return "both";
  return docs[0] === "kot" ? "kot" : "bill";
}

export function autoPrintModeToDocs(mode: AutoPrintDocMode): AutoPrintDoc[] {
  return mode === "both" ? ["kot", "bill"] : [mode];
}

/**
 * Documents the partner wants auto-printed
 * (partners.delivery_rules.bill_auto_print_docs).
 *
 * Rows written before this setting existed have no such field, and auto-print
 * only ever produced the bill — so an absent (or entirely unrecognised) value
 * means ["bill"], never "nothing". Printing nothing is the one failure mode
 * nobody notices until the middle of service.
 */
export function getBillAutoPrintDocs(deliveryRules: any): AutoPrintDoc[] {
  const raw = parseDeliveryRules(deliveryRules)?.bill_auto_print_docs;
  const picked = Array.isArray(raw) ? AUTO_PRINT_DOC_ORDER.filter((d) => raw.includes(d)) : [];
  return picked.length ? picked : ["bill"];
}

/** The KOT wants the earliest status that means "this order is real". */
export const DEFAULT_KOT_AUTO_PRINT_STATUS = "accepted";

/**
 * Which status prints the KOT (partners.delivery_rules.kot_auto_print_status).
 * Kept apart from the bill's status because pinning both to one status would
 * make "Bill + KOT" useless for one of them: a kitchen ticket that arrives at
 * "completed" is a ticket for food that is already cooked.
 */
export function getKotAutoPrintStatus(deliveryRules: any): string {
  const v = parseDeliveryRules(deliveryRules)?.kot_auto_print_status;
  return BILL_AUTO_PRINT_STATUSES.some((s) => s.value === v)
    ? (v as string)
    : DEFAULT_KOT_AUTO_PRINT_STATUS;
}

/**
 * The documents to print now that an order has just reached `status` — the only
 * question the order store actually asks. Empty when auto-print is off, or when
 * nothing is armed on this particular status.
 */
export function getAutoPrintDocsForStatus(
  deliveryRules: any,
  status: string,
): AutoPrintDoc[] {
  if (!isBillAutoPrintEnabled(deliveryRules)) return [];
  const statusOf: Record<AutoPrintDoc, string> = {
    kot: getKotAutoPrintStatus(deliveryRules),
    bill: getBillAutoPrintStatus(deliveryRules),
  };
  return getBillAutoPrintDocs(deliveryRules).filter((d) => statusOf[d] === status);
}
