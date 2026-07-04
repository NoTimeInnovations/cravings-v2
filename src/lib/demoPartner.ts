// Allow-lists that scope internal / demo-only surfaces to specific partners so
// they never leak to real partners.

// Partners allowed to use demo-only auto order progression. Kept to our own test
// accounts so the toggle never leaks and the cron never touches real orders.
export const AUTO_PROGRESS_PARTNER_IDS = [
  "cc101d1f-eb37-42e1-9c6a-5384a3def37f", // OREO DEMO
];

export function isAutoProgressPartner(partnerId?: string | null): boolean {
  return !!partnerId && AUTO_PROGRESS_PARTNER_IDS.includes(partnerId);
}

// Partners that use the public API — only they see the "API usage" analytics.
export const API_USAGE_PARTNER_IDS = [
  "9a1b79b8-f09e-4116-92bd-549358d31727", // HOT N COOL
  "cc101d1f-eb37-42e1-9c6a-5384a3def37f", // OREO DEMO
];

export function canSeeApiUsage(partnerId?: string | null): boolean {
  return !!partnerId && API_USAGE_PARTNER_IDS.includes(partnerId);
}
