/**
 * Names of the httpOnly session cookies, kept in ONE place so the files that
 * read and write them cannot drift apart.
 *
 * They live in a plain module rather than in either "use server" file that uses
 * them: a "use server" module may only export async functions (so it cannot
 * export a const), and src/app/auth/actions.ts — which has to clear the Televery
 * marker on every login and sign-out — must not import the action file that
 * already imports IT.
 */

/** The session itself: {id, role, feature_flags, status}, 30 days, httpOnly. */
export const AUTH_COOKIE = "new_auth_token";

/**
 * Marks an active Televery → outlet session swap
 * (src/app/actions/televerySession.ts).
 *
 * Holding it is what makes "Exit to marketplace" hand the holder Televery's
 * session back, so it is a capability and not a hint: it is minted with the
 * swapped session and must be destroyed with it.
 */
export const TELEVERY_PARENT_COOKIE = "televery_parent_session";
