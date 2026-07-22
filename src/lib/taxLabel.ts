// Helper for presenting the order tax as "VAT" vs "GST".
//
// A partner shows VAT (instead of the India-style GST / CGST+SGST split) when
// either (a) they are in a VAT country — UAE — or (b) they have explicitly
// enabled the "Use VAT" billing toggle (partners.delivery_rules.use_vat). The
// toggle lets non-UAE partners (e.g. other GCC / VAT regimes) label their tax
// as VAT without depending on the country field.
//
// delivery_rules is sometimes stored as a stringified JSON blob, so tolerate
// both object and string forms.

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

/** Whether the tax should be presented as VAT (vs GST). */
export function isVatEnabled(country?: string | null, deliveryRules?: any): boolean {
  if (country === "United Arab Emirates") return true;
  return !!parseDeliveryRules(deliveryRules)?.use_vat;
}

/** The tax label to show on bills / checkout — "VAT" or "GST". */
export function taxLabel(country?: string | null, deliveryRules?: any): "VAT" | "GST" {
  return isVatEnabled(country, deliveryRules) ? "VAT" : "GST";
}
