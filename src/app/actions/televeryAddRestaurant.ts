"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { quickSignupFromGoogle } from "@/app/actions/quickSignupFromGoogle";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import { generateUniqueUsername } from "@/app/actions/checkUsername";
import { checkEmailUnique } from "@/app/actions/checkEmail";
import { revalidateTag } from "@/app/actions/revalidate";
import { setPartnerBranchMutation } from "@/api/branches";
import { updatePartnerMutation } from "@/api/partners";
import { TELEVERY_ROLE } from "@/lib/televery";

const GET_BRANCH_ID = `
query TeleveryBranchId($parent_partner_id: uuid!) {
  branches(where: { parent_partner_id: { _eq: $parent_partner_id } }, limit: 1) {
    id
  }
}`;

// The Google create path drops two per-item fields on the floor — image_url (it
// hardcodes "") and priority (it sets none, so every row lands at 0) — so we
// patch them back on afterwards. One mutation for the whole menu: the results
// come back in the order they were sent, which is how we know which rows the
// patch actually matched.
const PATCH_MENU_ROWS = `
mutation TeleveryPatchMenuRows($updates: [menu_updates!]!) {
  update_menu_many(updates: $updates) {
    affected_rows
  }
}`;

// Used to recover a partner that was inserted before its signup blew up — see
// findCreatedPartnerByEmail.
const PARTNER_BY_EMAIL = `
query TeleveryPartnerByEmail($email: String!) {
  partners(where: { email: { _eq: $email } }, limit: 1) {
    id
    username
  }
}`;

/** One menu row to create with the restaurant. */
export interface TeleveryDraftMenuItem {
  name: string;
  price: number;
  description?: string;
  /** Display name; categories are created from the distinct values in the list. */
  category: string;
  /** Permanent URL (S3 / image bank). Empty when the operator set no image. */
  image_url?: string;
  variants?: { name: string; price: number }[];
}

/** Everything the "Add a restaurant" form collects about the business itself. */
export interface TeleveryRestaurantDetails {
  /** Store name. Also the seed for the username. */
  name: string;
  email: string;
  /** Local digits only — no dial code (how partners.phone is stored elsewhere). */
  phone: string;
  /** E.164 dial code with the leading "+", e.g. "+91" → partners.country_code. */
  countryCode: string;
  country: string;
  /** partners.currency stores the SYMBOL (₹ / $ / €), never the ISO code. */
  currency: string;
  /** Human-readable address (not a Maps URL) → partners.location. */
  address: string;
  lat: number;
  lng: number;
  district?: string;
  state?: string;
  /** Google place_id, when the pin came from a listing / Places search. */
  placeId?: string;
}

export interface TeleveryAddRestaurantResult {
  partnerId: string;
  username: string;
  /** False when the partner was created but attaching it to the brand failed. */
  linked: boolean;
  /**
   * Things that went wrong AFTER the partner row existed (a half-finished
   * signup, images that didn't attach). The restaurant is real either way, so
   * these are reported to the operator rather than thrown.
   */
  warnings: string[];
}

function assertValidDetails(d: TeleveryRestaurantDetails) {
  if (!d?.name?.trim()) throw new Error("Enter the restaurant name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((d.email || "").trim())) {
    throw new Error("Enter a valid email address.");
  }
  const digits = (d.phone || "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) {
    throw new Error("Enter a valid phone number.");
  }
  if (!d.country?.trim()) throw new Error("Pick a country.");
  if (
    typeof d.lat !== "number" ||
    typeof d.lng !== "number" ||
    Number.isNaN(d.lat) ||
    Number.isNaN(d.lng) ||
    (d.lat === 0 && d.lng === 0)
  ) {
    throw new Error("Drop a pin on the map for this restaurant.");
  }
}

/**
 * partners.geo_location is GeoJSON, which is LONGITUDE FIRST. Getting this
 * backwards silently puts every restaurant in the wrong hemisphere, so it lives
 * in one place.
 */
const toGeoPoint = (lat: number, lng: number) => ({
  type: "Point",
  coordinates: [lng, lat],
});

/** WhatsApp ordering works out of the box when the number is seeded here. */
const toWhatsappNumbers = (phone: string) =>
  phone ? [{ number: phone, area: "default" }] : [];

/** The display name an item's category is created under. */
const itemCategoryName = (item: TeleveryDraftMenuItem) =>
  (item.category || "Menu").trim() || "Menu";

/**
 * The key onBoardUserSignup stores categories under — it lowercases + underscores
 * the name BOTH when inserting the category and when matching items to it.
 */
const categoryKey = (name: string) =>
  name.toLowerCase().trim().replace(/ /g, "_");

/**
 * Fold every item onto the first spelling seen for its normalised key.
 *
 * Both create paths de-duplicate categories on the RAW string, so "Drinks" and
 * "drinks" arrive as two categories that collapse to ONE key on insert —
 * leaving a phantom empty category (or tripping the unique index and aborting
 * the signup). Canonicalising here means neither path ever sees the pair.
 */
function canonicaliseItemCategories(
  items: TeleveryDraftMenuItem[],
): TeleveryDraftMenuItem[] {
  const byKey = new Map<string, string>();
  return items.map((item) => {
    const display = itemCategoryName(item);
    const key = categoryKey(display);
    const canonical = byKey.get(key);
    if (canonical) return { ...item, category: canonical };
    byKey.set(key, display);
    return { ...item, category: display };
  });
}

/**
 * Find a partner by the email this call just claimed.
 *
 * Both create paths insert the PARTNER ROW FIRST and the categories/menu after,
 * so a throw past that point leaves an active partner with a live storefront
 * behind. The email was proven free moments earlier, so any row holding it now
 * is the one we just created — recovering it is what lets the brand link (and
 * the operator) carry on instead of the restaurant becoming an invisible orphan
 * that the email pre-check then blocks them from re-creating.
 */
async function findCreatedPartnerByEmail(
  email: string,
): Promise<{ id: string; username: string } | null> {
  try {
    const res = await fetchFromHasuraServer(PARTNER_BY_EMAIL, { email });
    const row = res?.partners?.[0];
    if (!row?.id) return null;
    return { id: row.id as string, username: (row.username as string) || "" };
  } catch (err) {
    console.error("televeryAddRestaurant: orphan lookup failed", err);
    return null;
  }
}

/**
 * Create the partner from the form alone (no Google listing). Mirrors the
 * payload /get-started builds, minus the fields onBoardUserSignup overwrites.
 */
async function createManually(
  d: TeleveryRestaurantDetails,
  items: TeleveryDraftMenuItem[],
  password: string,
): Promise<{ partnerId: string; username: string }> {
  // generateUniqueUsername returns "" when the slug is under 3 chars (e.g. a
  // store called "Q8"), so retry with a padded name before giving up.
  let username = await generateUniqueUsername(d.name);
  if (!username) username = await generateUniqueUsername(`${d.name} store`);
  if (!username) {
    throw new Error(
      "Could not build a username from that name — try a longer name.",
    );
  }

  // Categories are derived from the items themselves, so every item resolves to
  // one. (onBoardUserSignup silently DROPS items whose category it can't match,
  // and throws outright on an item with no `category` object at all.)
  //
  // De-duplicated on the SAME normalised key onBoardUserSignup stores them
  // under, not on the raw string — otherwise "Drinks" and "drinks" become two
  // rows that collapse to one key on insert.
  const categoryNames: string[] = [];
  const seenCategoryKeys = new Set<string>();
  for (const item of items) {
    const name = itemCategoryName(item);
    const key = categoryKey(name);
    if (seenCategoryKeys.has(key)) continue;
    seenCategoryKeys.add(key);
    categoryNames.push(name);
  }
  const categories = categoryNames.reduce<Record<string, any>>(
    (acc, name, index) => {
      acc[name] = { name, priority: index, is_active: true, id: `temp-cat-${index}` };
      return acc;
    },
    {},
  );
  const menuItems = items.reduce<Record<string, any>>((acc, item, index) => {
    acc[`temp-item-${index}`] = {
      name: item.name,
      price: Number(item.price) || 0,
      description: item.description || "",
      is_veg: false,
      image_url: item.image_url || "",
      is_available: true,
      category: { name: itemCategoryName(item) },
      variants: Array.isArray(item.variants) ? item.variants : [],
      priority: index,
    };
    return acc;
  }, {});

  const partner = {
    role: "partner",
    name: d.name.trim(),
    store_name: d.name.trim(),
    password,
    email: d.email.trim().toLowerCase(),
    phone: d.phone,
    country: d.country.trim(),
    country_code: d.countryCode,
    currency: d.currency,
    location: d.address || "",
    place_id: d.placeId || undefined,
    district: d.district || "",
    state: d.state || "",
    status: "active",
    upi_id: "",
    whatsapp_numbers: toWhatsappNumbers(d.phone),
    delivery_status: true,
    geo_location: toGeoPoint(d.lat, d.lng),
    social_links: JSON.stringify({}),
    store_banner: "",
    is_shop_open: true,
    // Only the COLOURS survive: onBoardUserSignup normalises menuStyle to the
    // v3 storefront + v2 checkout via applyNewPartnerThemeDefaults.
    theme: JSON.stringify({
      colors: { text: "#1a1a1a", bg: "#ffffff", accent: "#ea580c" },
      menuStyle: "v3",
    }),
    referral_code: null,
    username,
    signin_method: "email",
    // Deliberately NOT passed: feature_flags, subscription_details,
    // delivery_rules and delivery_rate — onBoardUserSignup is the policy
    // boundary for new-partner defaults and overwrites whatever we send.
  };

  const result = await onBoardUserSignup(
    { partner, categories, menu: { items: menuItems } },
    // Without this the new partner's session cookie replaces Televery's, logging
    // the operator out of their own dashboard and into the restaurant.
    { skipAuthCookie: true },
  );

  return { partnerId: result.partnerId, username };
}

/**
 * The form is the source of truth, so after the Google path has created the
 * partner from Google's own data we write the operator's values back over it.
 * Best-effort: the partner already exists, so a failed patch must not fail the
 * whole creation.
 */
async function applyOperatorOverrides(
  partnerId: string,
  d: TeleveryRestaurantDetails,
) {
  try {
    await fetchFromHasuraServer(updatePartnerMutation, {
      id: partnerId,
      updates: {
        name: d.name.trim(),
        store_name: d.name.trim(),
        phone: d.phone,
        whatsapp_numbers: toWhatsappNumbers(d.phone),
        country: d.country.trim(),
        country_code: d.countryCode,
        currency: d.currency,
        location: d.address || "",
        district: d.district || "",
        state: d.state || "",
        geo_location: toGeoPoint(d.lat, d.lng),
      },
    });
  } catch (err) {
    console.error("televeryAddRestaurant: override patch failed", err);
  }
}

/**
 * Fill in what the Google create path drops: the item images (it hardcodes
 * image_url: "") and the item order (it sets no priority, so every row lands at
 * 0 and the menu comes out in insertion order instead of the operator's).
 *
 * Rows are matched on name + category + price rather than name alone: the same
 * dish legitimately appears in two categories (a "Lime Soda" under Drinks and
 * under Combos) and a name-only match would give both rows the first one's
 * image. Priority is the index in the list the operator submitted, matching what
 * the manual path writes.
 *
 * Returns the image tally so the caller can tell the operator — an image that
 * quietly never attached looks exactly like one that did.
 */
async function applyItemOverrides(
  partnerId: string,
  items: TeleveryDraftMenuItem[],
): Promise<{ imagesFailed: number; imagesTotal: number }> {
  // Keep the submitted index for `priority`; skip rows that were never inserted.
  const targets = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.name?.trim());
  const imagesTotal = targets.filter(({ item }) => item.image_url).length;
  if (!targets.length) return { imagesFailed: 0, imagesTotal: 0 };

  const updates = targets.map(({ item, index }) => ({
    where: {
      partner_id: { _eq: partnerId },
      name: { _eq: item.name },
      price: { _eq: Number(item.price) || 0 },
      // Categories are stored normalised, so match on the same key.
      category: { name: { _eq: categoryKey(itemCategoryName(item)) } },
    },
    _set: {
      priority: index,
      ...(item.image_url ? { image_url: item.image_url } : {}),
    },
  }));

  try {
    const res = await fetchFromHasuraServer(PATCH_MENU_ROWS, { updates });
    // update_menu_many answers in request order, so index i is target i.
    const rows: ({ affected_rows?: number } | null)[] =
      res?.update_menu_many || [];
    const imagesFailed = targets.reduce((count, { item }, i) => {
      if (!item.image_url) return count;
      // Zero affected rows means the image never landed — count it as failed.
      return (rows[i]?.affected_rows ?? 0) > 0 ? count : count + 1;
    }, 0);
    if (imagesFailed) {
      console.error(
        `televeryAddRestaurant: ${imagesFailed}/${imagesTotal} item image(s) failed to attach`,
      );
    }
    return { imagesFailed, imagesTotal };
  } catch (err) {
    console.error("televeryAddRestaurant: menu patch failed", err);
    return { imagesFailed: imagesTotal, imagesTotal };
  }
}

/**
 * Create a restaurant and attach it to the signed-in marketplace's brand, in one
 * server-side step.
 *
 * Two paths, same result:
 *  - a Google listing was picked → quickSignupFromGoogle, which additionally
 *    pulls the banner photo, place_id and the AI-written website copy from the
 *    listing. The operator's edits are then written back over Google's values.
 *  - no listing → onBoardUserSignup straight from the form.
 *
 * The brand is resolved from the CALLER'S session rather than an argument, so
 * this can't be used to graft a partner onto someone else's brand.
 */
export async function televeryAddRestaurant(input: {
  details: TeleveryRestaurantDetails;
  items?: TeleveryDraftMenuItem[];
  /** Google place_id, when the operator picked a listing. */
  googlePlaceId?: string;
  /** Places session token, so autocomplete + details bill as one session. */
  sessionToken?: string;
  password?: string;
}): Promise<TeleveryAddRestaurantResult> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== TELEVERY_ROLE) {
    throw new Error("Not authorised.");
  }

  const details = input.details;
  assertValidDetails(details);
  const email = details.email.trim().toLowerCase();
  const items = canonicaliseItemCategories(
    Array.isArray(input.items) ? input.items : [],
  );
  // Both create paths default the login password the same way the rest of the
  // admin-side onboarding does; the owner changes it after their first sign-in.
  const password =
    input.password && input.password.length >= 6 ? input.password : "123456";

  // Fail before creating anything — a duplicate email would otherwise blow up
  // mid-signup with a raw constraint error.
  const { isUnique } = await checkEmailUnique(email);
  if (!isUnique) {
    throw new Error("A partner with that email already exists.");
  }

  const branchRes = await fetchFromHasuraServer(GET_BRANCH_ID, {
    parent_partner_id: auth.id,
  });
  const branchId: string | undefined = branchRes?.branches?.[0]?.id;
  if (!branchId) {
    throw new Error("No brand is set up for this account yet.");
  }

  let partnerId: string;
  let username: string;
  const warnings: string[] = [];

  try {
    if (input.googlePlaceId) {
      const created = await quickSignupFromGoogle({
        placeId: input.googlePlaceId,
        sessionToken: input.sessionToken,
        email,
        password,
        // Images are stripped here on purpose — quickSignupFromGoogle hardcodes
        // image_url: "" — so they're attached separately below.
        extractedItems: items.map((i) => ({
          name: i.name,
          price: Number(i.price) || 0,
          description: i.description || "",
          category: i.category,
          variants: i.variants,
        })),
        skipAuthCookie: true,
      });
      partnerId = created.partnerId;
      username = created.username;
    } else {
      const created = await createManually(details, items, password);
      partnerId = created.partnerId;
      username = created.username;
    }
  } catch (err) {
    // The partner row goes in before the categories/menu, so this may well have
    // left a live storefront behind. If it did, keep going — the brand link
    // below is what makes the restaurant visible at all, and re-running the form
    // is impossible anyway once the email is taken.
    const orphan = await findCreatedPartnerByEmail(email);
    if (!orphan) throw err;
    console.error(
      "televeryAddRestaurant: partner created but its signup failed midway",
      err,
    );
    partnerId = orphan.id;
    username = orphan.username;
    warnings.push(
      `The account was created (id ${orphan.id}) but the signup did not finish — open the restaurant and check its menu before handing it over.`,
    );
  }

  if (input.googlePlaceId) {
    await applyOperatorOverrides(partnerId, details);
    const { imagesFailed, imagesTotal } = await applyItemOverrides(
      partnerId,
      items,
    );
    if (imagesFailed) {
      warnings.push(
        `${imagesFailed} of ${imagesTotal} item image(s) could not be attached — set them from the restaurant's menu screen.`,
      );
    }
  }

  // The partner exists at this point. If the link fails we surface it rather
  // than throwing, so the operator knows the restaurant was created and only
  // the attachment needs retrying (throwing would imply nothing happened).
  let linked = false;
  try {
    await fetchFromHasuraServer(setPartnerBranchMutation, {
      partner_id: partnerId,
      branch_id: branchId,
    });
    linked = true;
  } catch (err) {
    console.error("televeryAddRestaurant: created but failed to link", err);
  }

  // onBoardUserSignup does NOT revalidate, so without this the new storefront
  // keeps serving a 404 from the ISR cache.
  try {
    await revalidateTag(partnerId);
  } catch (err) {
    console.error("televeryAddRestaurant: revalidate failed", err);
  }

  return { partnerId, username, linked, warnings };
}
