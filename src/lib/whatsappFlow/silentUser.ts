import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  userLoginQuery,
  userLoginMutation,
  resetDeletionStatusMutation,
} from "@/api/auth";

// WhatsApp delivers the sender's number WITH the country code (e.g.
// 919876543210). Customer accounts are keyed by the LOCAL number — the email
// `${local}@user.com`, the same form the OTP login uses — so we strip the
// partner's calling code to land on the SAME account instead of forking a
// duplicate.
export function toLocalPhone(waPhone: string, callingCode?: string | null): string {
  let p = String(waPhone || "").replace(/[^0-9]/g, "");
  const cc = String(callingCode || "").replace(/[^0-9]/g, ""); // "+91" -> "91"
  if (cc && p.length > cc.length && p.startsWith(cc)) {
    p = p.slice(cc.length);
  } else if (!cc && p.length === 12 && p.startsWith("91")) {
    // Partner has no calling code on file — assume India (the common case) so
    // we still merge rather than create a parallel account.
    p = p.slice(2);
  }
  return p;
}

// Find an existing customer by phone, or silently create one from their
// WhatsApp profile name + phone. Mirrors authStore.signInWithPhone's
// find-or-create, but with no browser session (this runs from the webhook).
// Returns the user id, or null on failure (caller falls back to a non-authed
// order link).
export async function findOrCreateUserByPhone(
  localPhone: string,
  name?: string | null,
): Promise<string | null> {
  if (!localPhone || localPhone.length < 6) return null;
  try {
    const email = `${localPhone}@user.com`;

    const found = (await fetchFromHasura(userLoginQuery, { email })) as {
      users?: Array<{ id: string }>;
    };
    if (found?.users?.length) {
      const id = found.users[0].id;
      // Re-activate a soft-deleted account on re-engagement, matching login.
      await fetchFromHasura(resetDeletionStatusMutation, { id }).catch(() => {});
      return id;
    }

    const cleanName = (name || "").trim();
    const created = (await fetchFromHasura(userLoginMutation, {
      object: {
        email,
        password: localPhone,
        full_name: cleanName || `User${localPhone.slice(0, 5)}`,
        phone: localPhone,
        crave_coins: 100,
        location: null,
        role: "user",
      },
    })) as { insert_users_one?: { id: string } };

    return created?.insert_users_one?.id ?? null;
  } catch (e) {
    console.error("findOrCreateUserByPhone failed:", e);
    return null;
  }
}

// Partner calling codes barely ever change, and the inbound path runs on every
// single message, so the lookup is cached for the life of the lambda instance.
const callingCodeCache = new Map<string, string | null>();

const PARTNER_CC = `
  query PartnerCallingCode($id: uuid!) {
    partners_by_pk(id: $id) { country_code }
  }
`;

/**
 * Make sure anyone who messages a restaurant has an account, whatever they said.
 *
 * Previously this only happened once an inbound message MATCHED a flow trigger,
 * which is why roughly half the people who have written to a partner have no
 * account at all: "hi" created one, "do you deliver to Kakkanad?" did not. Since
 * the account is what later lets them be recognised, auto-signed-in from a link,
 * and credited with their orders, the useful moment to create it is first
 * contact — not first correctly-worded contact.
 *
 * Idempotent (find-or-create keyed on the local phone) and never throws: this
 * runs on the reply path, and a customer waiting on an answer must not be made
 * to wait on account bookkeeping, nor lose the reply if it fails.
 */
export async function ensureCustomerAccount(
  partnerId: string,
  contactPhone: string,
  contactName?: string | null,
): Promise<string | null> {
  try {
    let cc = callingCodeCache.get(partnerId);
    if (cc === undefined) {
      const res = (await fetchFromHasura(PARTNER_CC, { id: partnerId })) as {
        partners_by_pk?: { country_code?: string | null } | null;
      };
      cc = res?.partners_by_pk?.country_code ?? null;
      callingCodeCache.set(partnerId, cc);
    }
    const local = toLocalPhone(contactPhone, cc);
    if (!local || local.length < 6) return null;
    return await findOrCreateUserByPhone(local, contactName);
  } catch (e) {
    console.error("[silentUser] ensureCustomerAccount failed:", e);
    return null;
  }
}
