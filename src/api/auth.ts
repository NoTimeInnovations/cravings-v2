/*...........query...........*/

export const userLoginQuery = `
  query GetUserByEmail($email: String!) {
  users(where: {email: {_eq: $email}}, limit: 1) {
    id
    email
    full_name
    phone
    crave_coins
    location
    addresses
  }
}`;

// partner table data query
export const partnerQuery = `
  query GetPartnerByEmail($email: String!) {
  partners(where: {email: {_eq: $email}}, limit: 1) {
    id
  }
}`;

export const partnerIdQuery = `
  query GetPartnerById($id: uuid!) {
    partners_by_pk(id: $id) {
      id
      name
      email
      password
      store_name
      petpooja_restaurant_id
      store_banner
      whatsapp_numbers
      footnote
      location
      status
      social_links
      upi_id
      show_payment_qr
      post_payment_message
      fssai_licence_no
      feature_flags
      loyalty_settings
      otp_sender
      description
      phone
      district
      state
      theme
      is_shop_open
      currency
      place_id
      gst_no
      country
      gst_percentage
      business_type
      geo_location
      delivery_rate
      delivery_rules
      price_adjustment
      takeaway_price_adjustment
      country_code
      location_details
      hide_unavailable
      subscription_details
      username
      custom_domain
      gtm_container_id
      official_name
      about_us
      operating_address
      official_email_id
      official_phone_number
      has_seen_tour
      cashfree_merchant_id
      adloggs_merchant_id
      porter_mobile
      uber_mobile
      rapido_mobile
      accept_payments_via_cashfree
      accept_cod
      payment_modes
      storefront_settings
      prebooking_settings
      order_types_enabled
      website_config
      qr_codes(limit: 1) {
        id
      }
    }
  }
`;

export const partnerLoginQuery = `
  query PartnerLogin($email: String!, $password: String!) {
    partners(where: {
      email: {_eq: $email}, 
      password: {_eq: $password}
    }, limit: 1) {
      id
      name
      email
      password
      store_name
      petpooja_restaurant_id
      store_banner
      whatsapp_numbers
      footnote
      location
      status
      social_links
      upi_id
      show_payment_qr
      post_payment_message
      fssai_licence_no
      feature_flags
      loyalty_settings
      otp_sender
      description
      phone
      district
      state
      theme
      is_shop_open
      currency
      place_id
      gst_no
      country
      gst_percentage
      business_type
      geo_location
      delivery_rate
      delivery_rules
      price_adjustment
      takeaway_price_adjustment
      country_code
      location_details
      hide_unavailable
      subscription_details
      username
      custom_domain
      gtm_container_id
      official_name
      about_us
      operating_address
      official_email_id
      official_phone_number
      has_seen_tour
      cashfree_merchant_id
      adloggs_merchant_id
      porter_mobile
      uber_mobile
      rapido_mobile
      accept_payments_via_cashfree
      accept_cod
      payment_modes
      storefront_settings
      prebooking_settings
      order_types_enabled
      website_config
      qr_codes(limit: 1) {
        id
      }
    }
  }
`;

export const superAdminLoginQuery = `
  query SuperAdminLogin($email: String!, $password: String!) {
    super_admin(where: {email: {_eq: $email}, password: {_eq: $password}}) {
      id
      email
    }
  }
`;

export const superAdminIdQuery = `
  query GetSuperAdminById($id: uuid!) {
    super_admin_by_pk(id: $id) {
      id
      email
    }
  }
`;

export const getUserByIdQuery = `
  query GetUserById($id: uuid!) {
    users_by_pk(id: $id) {
      id
      email
      full_name
      phone
      crave_coins
      location
      addresses
    }
  }
`;

/*...........mutation...........*/

export const userLoginMutation = `
  mutation InsertUser($object: users_insert_input!) {
  insert_users_one(object: $object) {
    id
    email
    full_name
    phone
    crave_coins
    location
    addresses
  }
}`;

// Update user addresses JSON
export const updateUserAddressesMutation = `
  mutation UpdateUserAddresses($id: uuid!, $addresses: jsonb) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { addresses: $addresses }) {
      id
      addresses
    }
  }
`;

export const updateUserFullNameMutation = `
  mutation UpdateUserFullName($id: uuid!, $full_name: String) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { full_name: $full_name }) {
      id
      full_name
    }
  }
`;

export const updateUserPhoneMutation = `
  mutation UpdateUserPhone($id: uuid!, $phone: String) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { phone: $phone }) {
      id
      phone
    }
  }
`;

export const partnerMutation = `
  mutation InsertPartner($object: partners_insert_input!) {
  insert_partners_one(object: $object) {
    id
    name
    email
    password
    whatsapp_numbers
    store_name
    status
    upi_id
    description
    phone
    district
    country
    country
    state
    feature_flags
    loyalty_settings
    subscription_details
    username
  }
}`;

export const updatePartnerBannerMutation = `
  mutation UpdatePartnerBanner($id: uuid!, $store_banner: String!, $updated_at: timestamptz!) {
    update_partners_by_pk(
      pk_columns: { id: $id }
      _set: { store_banner: $store_banner, updated_at: $updated_at }
    ) {
      id
      store_banner
    }
  }
`;

export const deleteUserMutation = `
  mutation DeleteUser($id: uuid!) {
    delete_users_by_pk(id: $id) {
      id
      email
      full_name
    }
  }
`;

// Super-admin customer lookup: search users by name / phone / email. Empty query
// ("%%") lists everyone (capped by limit). Used by the Delete Customer tool.
export const searchUsersForAdminQuery = `
  query SearchUsersForAdmin($query: String!, $limit: Int = 50) {
    users(
      where: {
        _or: [
          { full_name: { _ilike: $query } },
          { phone: { _ilike: $query } },
          { email: { _ilike: $query } }
        ]
      },
      order_by: { email: asc },
      limit: $limit
    ) {
      id
      full_name
      phone
      email
    }
  }
`;

export const softDeleteUserMutation = `
  mutation SoftDeleteUser($id: uuid!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { deletion_status: 1 }) {
      id
    }
  }
`;

export const resetDeletionStatusMutation = `
  mutation ResetDeletionStatus($id: uuid!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { deletion_status: 0 }) {
      id
    }
  }
`;
