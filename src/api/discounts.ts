// Exported because the checkout modals run their own inline discount queries
// (auto-apply, coupon list) and used to spell out their own column lists — so a
// column added here, like BXGY's condition/reward, arrived as undefined there.
export const discountFields = `
  id
  code
  description
  terms_conditions
  discount_type
  discount_value
  min_order_value
  max_discount_amount
  usage_limit
  per_user_usage_limit
  used_count
  is_active
  starts_at
  expires_at
  valid_days
  valid_time_from
  valid_time_to
  discount_order_types
  discount_on_total
  has_coupon
  applicable_on
  category_item_ids
  rank
  pp_discount_id
  pp_overwrite_enabled
  freebie_item_count
  freebie_item_ids
  show_on_storefront
  show_in_checkout
  banner_text
  bxgy_buy_type
  bxgy_buy_item_ids
  bxgy_buy_quantity
  bxgy_buy_value
  bxgy_reward_type
  bxgy_reward_value
  bxgy_max_repeat
  created_at
`;

export const getDiscountsQuery = `
  query GetDiscounts($partner_id: uuid!) {
    discounts(
      where: { partner_id: { _eq: $partner_id } }
      order_by: [{ rank: asc_nulls_last }, { created_at: desc }]
    ) {
      ${discountFields}
    }
  }
`;

export const createDiscountMutation = `
  mutation CreateDiscount($object: discounts_insert_input!) {
    insert_discounts_one(object: $object) {
      ${discountFields}
    }
  }
`;

export const updateDiscountMutation = `
  mutation UpdateDiscount($id: uuid!, $updates: discounts_set_input!) {
    update_discounts_by_pk(pk_columns: { id: $id }, _set: $updates) {
      ${discountFields}
    }
  }
`;

export const deleteDiscountMutation = `
  mutation DeleteDiscount($id: uuid!) {
    delete_discounts_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * A typed coupon code as an ILIKE pattern for validateDiscountQuery.
 *
 * Matching is case-INSENSITIVE on purpose. The customer types this by hand, and
 * the stored codes are not reliably upper-case: the dashboard upper-cases what
 * it saves, but Petpooja sync keeps the POS's own casing, and older rows predate
 * the rule — 8 of 66 live codes are mixed/lower case. Both checkouts upper-cased
 * the input before an `_eq` lookup, so those codes came back "invalid" no matter
 * how they were typed.
 *
 * `%` and `_` are ILIKE wildcards, so they are escaped here: a code is always
 * matched whole, never as a pattern.
 */
export const couponCodePattern = (code: string) =>
  code.trim().replace(/([\\%_])/g, "\\$1");

export const validateDiscountQuery = `
  query ValidateDiscount($partner_id: uuid!, $code: String!) {
    discounts(
      where: {
        partner_id: { _eq: $partner_id }
        code: { _ilike: $code }
        is_active: { _eq: true }
        has_coupon: { _eq: true }
        _or: [
          { expires_at: { _is_null: true } }
          { expires_at: { _gt: "now()" } }
        ]
      }
      limit: 1
    ) {
      ${discountFields}
    }
  }
`;

export const incrementDiscountUsageMutation = `
  mutation IncrementDiscountUsage($id: uuid!) {
    update_discounts_by_pk(
      pk_columns: { id: $id }
      _inc: { used_count: 1 }
    ) {
      id
      used_count
    }
  }
`;

export const getUserDiscountUsageQuery = `
  query GetUserDiscountUsage($user_id: uuid!, $partner_id: uuid!, $code: String!) {
    orders_aggregate(
      where: {
        user_id: { _eq: $user_id }
        partner_id: { _eq: $partner_id }
        discounts: { _contains: [{ code: $code }] }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
