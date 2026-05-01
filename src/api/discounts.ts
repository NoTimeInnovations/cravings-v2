const discountFields = `
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
  freebie_item_count
  freebie_item_ids
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

export const validateDiscountQuery = `
  query ValidateDiscount($partner_id: uuid!, $code: String!) {
    discounts(
      where: {
        partner_id: { _eq: $partner_id }
        code: { _eq: $code }
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
