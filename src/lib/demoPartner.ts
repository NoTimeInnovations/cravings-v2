// Partners allowed to use demo-only features (currently: auto order
// progression). Kept to our own test accounts so the toggle never leaks to real
// partners and the cron never touches real orders.
export const AUTO_PROGRESS_PARTNER_IDS = [
  "cc101d1f-eb37-42e1-9c6a-5384a3def37f", // OREO DEMO
];

export function isAutoProgressPartner(partnerId?: string | null): boolean {
  return !!partnerId && AUTO_PROGRESS_PARTNER_IDS.includes(partnerId);
}
