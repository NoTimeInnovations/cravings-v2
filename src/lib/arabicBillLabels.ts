// English → Arabic bill/KOT label map for the "Full Arabic" print option.
//
// This mirrors the desktop print app's arabicLabels.js exactly (same label set),
// so a receipt printed via the browser looks the same as one rendered/rasterized
// by the desktop app. The web /bill and /kot pages translate their static labels
// through makeLabeler() when partners.delivery_rules.bill_full_arabic is on; the
// desktop then does NOT re-inject Arabic (the page already rendered it).
//
// Only these labels are translated — anything not in the map stays English on both
// the web and the desktop (e.g. "KITCHEN ORDER TICKET", "ITEMS:", "Generated at:").

export const AR_BILL_LABELS: Record<string, string> = {
  "Order Details:": "تفاصيل الطلب:",
  "Items Ordered": "الأصناف المطلوبة",
  "Pay Via:": "طريقة الدفع:",
  "Thank you for your visit!": "شكراً لزيارتكم!",
  "Thank you for your visit": "شكراً لزيارتكم",
  "Powered By Menuthere": "مدعوم من Menuthere",
  "Order :": "رقم الطلب :",
  "Order:": "رقم الطلب:",
  "Tel:": "هاتف:",
  "Date:": "التاريخ:",
  "Type:": "النوع:",
  "Time:": "الوقت:",
  "Subtotal:": "المجموع الفرعي:",
  "TOTAL:": "الإجمالي:",
  "Total:": "الإجمالي:",
};

/**
 * Returns a labeler `(en) => string`. When `fullArabic` is true it maps known
 * English labels to Arabic (falling back to the original for anything unmapped);
 * when false it returns the English unchanged. Use it to wrap the static labels
 * on the /bill and /kot print pages, e.g. `{L("Subtotal:")}`.
 */
export function makeLabeler(fullArabic: boolean): (en: string) => string {
  if (!fullArabic) return (en) => en;
  return (en) => AR_BILL_LABELS[en] ?? en;
}
