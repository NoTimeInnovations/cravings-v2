// Televery — a marketplace-style partner that aggregates many independent shops
// and restaurants as outlets of its brand (a `branches` row whose
// parent_partner_id is Televery itself; member partners carry branch_id).
//
// Televery signs in at /televeryLogin with its normal partner credentials, but
// the session is stamped with the `televery` role so middleware routes it to the
// marketplace dashboard at /televery instead of the usual /admin-v2 partner
// dashboard. This is deliberately scoped to the single Televery account rather
// than to "any brand parent" — see the guard in the login action.

export const TELEVERY_ROLE = "televery" as const;

/** The Televery partner row. Its credentials are the ones /televeryLogin accepts. */
export const TELEVERY_PARTNER_ID = "4cadd5f2-80ed-499d-a3c2-522e92c94666";

/** Fallback identity check, in case the row is ever recreated under a new id. */
export const TELEVERY_USERNAME = "televery";

export const TELEVERY_DASHBOARD_PATH = "/televeryDashboard";
export const TELEVERY_LOGIN_PATH = "/televeryLogin";

/**
 * True for the one partner allowed into the marketplace dashboard. Matches on id
 * first, then username, so a re-created row keeps working without a code change.
 */
export function isTeleveryPartner(
  partner: { id?: string | null; username?: string | null } | null | undefined,
): boolean {
  if (!partner) return false;
  if (partner.id && partner.id === TELEVERY_PARTNER_ID) return true;
  return (partner.username || "").toLowerCase() === TELEVERY_USERNAME;
}
