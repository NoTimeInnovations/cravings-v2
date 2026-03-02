export const getDiscountCodesQuery = `
  query GetDiscountCodes($partner_id: uuid!) {
    discount_codes(
      where: { partner_id: { _eq: $partner_id } }
      order_by: [{ rank: asc_nulls_last }, { created_at: desc }]
    ) {
      id
      code
      description
      terms_conditions
      discount_type
      discount_value
      min_order_value
      max_discount_amount
      usage_limit
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
      created_at
    }
  }
`;

export const createDiscountCodeMutation = `
  mutation CreateDiscountCode($object: discount_codes_insert_input!) {
    insert_discount_codes_one(object: $object) {
      id
      code
      description
      terms_conditions
      discount_type
      discount_value
      min_order_value
      max_discount_amount
      usage_limit
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
      created_at
    }
  }
`;

export const updateDiscountCodeMutation = `
  mutation UpdateDiscountCode($id: uuid!, $updates: discount_codes_set_input!) {
    update_discount_codes_by_pk(pk_columns: { id: $id }, _set: $updates) {
      id
      is_active
    }
  }
`;

export const deleteDiscountCodeMutation = `
  mutation DeleteDiscountCode($id: uuid!) {
    delete_discount_codes_by_pk(id: $id) {
      id
    }
  }
`;

export const validateDiscountCodeQuery = `
  query ValidateDiscountCode($partner_id: uuid!, $code: String!) {
    discount_codes(
      where: {
        partner_id: { _eq: $partner_id }
        code: { _eq: $code }
        is_active: { _eq: true }
        _or: [
          { expires_at: { _is_null: true } }
          { expires_at: { _gt: "now()" } }
        ]
      }
      limit: 1
    ) {
      id
      code
      description
      terms_conditions
      discount_type
      discount_value
      min_order_value
      max_discount_amount
      usage_limit
      used_count
      starts_at
      valid_days
      valid_time_from
      valid_time_to
      discount_order_types
      discount_on_total
      has_coupon
      applicable_on
      category_item_ids
    }
  }
`;

export const incrementDiscountUsageMutation = `
  mutation IncrementDiscountUsage($id: uuid!) {
    update_discount_codes_by_pk(
      pk_columns: { id: $id }
      _inc: { used_count: 1 }
    ) {
      id
      used_count
    }
  }
`;
