// The packaging charge is STORED in extra_charges as "Parcel Charge" — the
// canonical name the Petpooja order mapper keys on to add it to the POS bill.
// Customer- and admin-facing UIs show it as "Packaging Charge" instead. Swap at
// DISPLAY time only; never rename the stored value (renaming it dropped the
// charge from the Petpooja bill — the mapper didn't recognise "Packaging Charge").
//
// Dependency-free on purpose so it's safe to import in both client components
// and server routes (e.g. the WhatsApp order-status text).
export const displayChargeName = (name?: string | null): string => {
  const n = (name || "").trim();
  return n.toLowerCase() === "parcel charge" ? "Packaging Charge" : n;
};
