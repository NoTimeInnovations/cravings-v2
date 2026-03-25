import { fetchFromHasura } from "@/lib/hasuraClient";
import { createDiscountMutation } from "@/api/discounts";

/**
 * Petpooja discount type mapping:
 * 1 = Percentage
 * 2 = Flat
 * 7 = Freebie
 */
const PP_DISCOUNT_TYPE_MAP: Record<string, "percentage" | "flat" | "freebie"> = {
  "1": "percentage",
  "2": "flat",
  "7": "freebie",
};

export interface PetpoojaDiscount {
  discountid: string;
  discountname: string;
  description?: string;
  discounttype: string;
  discount: string;
  discountordertype?: string;
  discountapplicableon?: string;
  discountdays?: string;
  active?: string;
  terms_conditions?: string;
  rank?: string;
  discountontotal?: string;
  discountstarts?: string;
  discountends?: string;
  discounttimefrom?: string;
  discounttimeto?: string;
  discountminamount?: string;
  discounthascoupon?: string;
  discountmaxlimit?: string;
  freebie_item_count?: string;
  freebie_item_ids?: string;
}

/**
 * Maps a Petpooja discount object to the Cravings discount schema
 * and inserts it into the database for the given partner.
 */
export function mapPetpoojaDiscount(ppDiscount: PetpoojaDiscount, partnerId: string) {
  const discountType = PP_DISCOUNT_TYPE_MAP[ppDiscount.discounttype];
  if (!discountType) {
    console.warn(`Unknown Petpooja discount type: ${ppDiscount.discounttype}`);
    return null;
  }

  const object: Record<string, any> = {
    partner_id: partnerId,
    code: ppDiscount.discountname,
    description: ppDiscount.description || null,
    terms_conditions: ppDiscount.terms_conditions || null,
    discount_type: discountType,
    discount_value: Number(ppDiscount.discount) || 0,
    is_active: ppDiscount.active === "1",
    used_count: 0,
    has_coupon: ppDiscount.discounthascoupon === "1",
    discount_on_total: ppDiscount.discountontotal === "1",
    applicable_on: ppDiscount.discountapplicableon || "All",
    valid_days: ppDiscount.discountdays || "All",
    discount_order_types: ppDiscount.discountordertype || null,
    pp_discount_id: ppDiscount.discountid,
    rank: ppDiscount.rank ? Number(ppDiscount.rank) : null,
  };

  if (ppDiscount.discountminamount) {
    object.min_order_value = Number(ppDiscount.discountminamount);
  }
  if (ppDiscount.discountmaxlimit) {
    object.max_discount_amount = Number(ppDiscount.discountmaxlimit);
  }
  if (ppDiscount.discountstarts) {
    object.starts_at = new Date(ppDiscount.discountstarts).toISOString();
  }
  if (ppDiscount.discountends) {
    object.expires_at = new Date(ppDiscount.discountends).toISOString();
  }
  if (ppDiscount.discounttimefrom) {
    object.valid_time_from = ppDiscount.discounttimefrom;
  }
  if (ppDiscount.discounttimeto) {
    object.valid_time_to = ppDiscount.discounttimeto;
  }

  // Freebie-specific fields
  if (discountType === "freebie") {
    object.freebie_item_count = ppDiscount.freebie_item_count
      ? Number(ppDiscount.freebie_item_count)
      : null;
    object.freebie_item_ids = ppDiscount.freebie_item_ids || null;
  }

  return object;
}

/**
 * Resolves Petpooja item IDs (stored in freebie_item_ids) to actual
 * menu items from our DB. Call this on the frontend when you need to
 * display freebie item details.
 *
 * freebie_item_ids is a comma-separated string of pp_ids e.g. "1302220959,1302220960"
 */
export async function resolveFreebieItems(
  freebieItemIds: string,
  partnerId: string
) {
  const ppIds = freebieItemIds.split(",").map((id) => id.trim()).filter(Boolean);
  if (ppIds.length === 0) return [];

  try {
    const res = await fetchFromHasura(
      `query ResolveFreebieItems($pp_ids: [String!]!, $partner_id: uuid!) {
        menu(where: { pp_id: { _in: $pp_ids }, partner_id: { _eq: $partner_id } }) {
          id
          name
          price
          image_url
          pp_id
        }
      }`,
      { pp_ids: ppIds, partner_id: partnerId }
    );
    return res?.menu ?? [];
  } catch (err) {
    console.error("Failed to resolve freebie items:", err);
    return [];
  }
}

/**
 * Processes an array of Petpooja discounts and upserts them into the
 * Cravings database for the given partner. Handles flat, percentage,
 * and freebie discount types.
 *
 * Call this from your pp_menu_insert handler when Petpooja pushes discount data.
 */
export async function upsertPetpoojaDiscounts(
  ppDiscounts: PetpoojaDiscount[],
  partnerId: string
) {
  const results: { success: boolean; discountId: string; error?: string }[] = [];

  for (const ppDiscount of ppDiscounts) {
    const mapped = mapPetpoojaDiscount(ppDiscount, partnerId);
    if (!mapped) {
      results.push({
        success: false,
        discountId: ppDiscount.discountid,
        error: `Unknown discount type: ${ppDiscount.discounttype}`,
      });
      continue;
    }

    try {
      const res = await fetchFromHasura(createDiscountMutation, { object: mapped });
      results.push({
        success: true,
        discountId: ppDiscount.discountid,
      });
    } catch (err: any) {
      // If it already exists (uniqueness violation), try updating instead
      if (err?.message?.includes("Uniqueness violation") || err?.message?.includes("unique")) {
        try {
          const updateRes = await fetchFromHasura(
            `mutation UpdatePPDiscount($pp_discount_id: String!, $partner_id: uuid!, $updates: discounts_set_input!) {
              update_discounts(
                where: { pp_discount_id: { _eq: $pp_discount_id }, partner_id: { _eq: $partner_id } }
                _set: $updates
              ) {
                affected_rows
              }
            }`,
            {
              pp_discount_id: ppDiscount.discountid,
              partner_id: partnerId,
              updates: {
                ...mapped,
                partner_id: undefined, // Don't update partner_id
              },
            }
          );
          results.push({ success: true, discountId: ppDiscount.discountid });
        } catch (updateErr: any) {
          results.push({
            success: false,
            discountId: ppDiscount.discountid,
            error: updateErr.message,
          });
        }
      } else {
        results.push({
          success: false,
          discountId: ppDiscount.discountid,
          error: err.message,
        });
      }
    }
  }

  return results;
}
