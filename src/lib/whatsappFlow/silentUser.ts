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
