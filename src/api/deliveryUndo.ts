/**
 * Delivery Undo — GraphQL for the superadmin listing module.
 *
 * Delivery Undo is a separate consumer app that lists a hand-picked subset of
 * partners. These queries drive `superadmin?page=delivery-undo`; nothing here
 * touches partner behaviour inside Cravings itself.
 */

/*...........queries...........*/

/**
 * Partners eligible to be listed, with their current listing state.
 *
 * Only `active` partners are offered — listing an inactive partner would put
 * a kitchen in a consumer app that cannot take the order. Geo and WhatsApp
 * come along so the UI can flag rows that would break the app before anyone
 * lists them.
 */
export const getDuCandidatesQuery = `
query GetDuCandidates($search: String = "%", $district: String = "%", $limit: Int = 50, $offset: Int = 0, $extra: partners_bool_exp = {}) {
  partners(
    where: {
      status: {_eq: "active"},
      _and: [
        { _or: [
            {store_name: {_ilike: $search}},
            {username: {_ilike: $search}},
            {location: {_ilike: $search}}
        ]},
        { _or: [
            {district: {_ilike: $district}},
            {district: {_is_null: true}}
        ]},
        $extra
      ]
    }
    order_by: {store_name: asc}
    limit: $limit
    offset: $offset
  ) {
    id
    store_name
    username
    district
    location
    store_banner
    phone
    whatsapp_numbers
    geo_location
    country_code
    is_shop_open
    du_listing {
      partner_id
      is_listed
      rank_boost
      badge
      cuisines
      display_name_override
      tagline_override
      wa_number_override
      wa_message_template
      lat
      lng
      notes
      listed_at
    }
  }
  partners_aggregate(
    where: {
      status: {_eq: "active"},
      _and: [
        { _or: [
            {store_name: {_ilike: $search}},
            {username: {_ilike: $search}},
            {location: {_ilike: $search}}
        ]},
        { _or: [
            {district: {_ilike: $district}},
            {district: {_is_null: true}}
        ]},
        $extra
      ]
    }
  ) {
    aggregate { count }
  }
}
`;

/** Everything currently listed, ordered as the app would rank it. */
export const getDuListingsQuery = `
query GetDuListings {
  du_listings(
    where: {is_listed: {_eq: true}}
    order_by: [{rank_boost: desc}, {updated_at: desc}]
  ) {
    partner_id
    is_listed
    rank_boost
    badge
    cuisines
    display_name_override
    tagline_override
    wa_number_override
    wa_message_template
    lat
    lng
    notes
    listed_at
    updated_at
    partner {
      id
      store_name
      username
      district
      location
      store_banner
      phone
      whatsapp_numbers
      geo_location
      country_code
      is_shop_open
    }
  }
}
`;

/** Districts that currently have a listed kitchen — the notification targets. */
export const getDuDistrictsQuery = `
query GetDuDistricts {
  du_listings(where: {is_listed: {_eq: true}}) {
    partner { district location }
  }
}
`;

export const getDuAppConfigQuery = `
query GetDuAppConfig {
  du_app_config(where: {id: {_eq: 1}}) {
    config
    updated_at
  }
}
`;

export const getDuNotificationsQuery = `
query GetDuNotifications($limit: Int = 25) {
  du_notifications(order_by: {created_at: desc}, limit: $limit) {
    id
    title
    message
    audience_type
    audience_values
    route
    recipients
    status
    error
    sent_by
    created_at
  }
}
`;

/*...........mutations...........*/

/**
 * Upsert a listing row.
 *
 * `on_conflict` on the primary key means the UI never has to know whether a
 * partner has been touched before — toggling an unlisted partner and editing
 * an existing listing are the same call.
 */
export const upsertDuListingMutation = `
mutation UpsertDuListing($object: du_listings_insert_input!) {
  insert_du_listings_one(
    object: $object
    on_conflict: {
      constraint: du_listings_pkey
      update_columns: [
        is_listed, rank_boost, badge, cuisines,
        display_name_override, tagline_override, banner_override,
        wa_number_override, wa_message_template,
        lat, lng, notes, listed_at, listed_by
      ]
    }
  ) {
    partner_id
    is_listed
    rank_boost
    badge
    cuisines
  }
}
`;

/** Bulk list/unlist from the candidate table's checkboxes. */
export const bulkSetDuListedMutation = `
mutation BulkSetDuListed($objects: [du_listings_insert_input!]!) {
  insert_du_listings(
    objects: $objects
    on_conflict: {
      constraint: du_listings_pkey
      update_columns: [is_listed, listed_at, listed_by]
    }
  ) {
    affected_rows
  }
}
`;

export const updateDuAppConfigMutation = `
mutation UpdateDuAppConfig($config: jsonb!) {
  update_du_app_config_by_pk(
    pk_columns: {id: 1}
    _set: {config: $config}
  ) {
    config
    updated_at
  }
}
`;

export const insertDuNotificationMutation = `
mutation InsertDuNotification($object: du_notifications_insert_input!) {
  insert_du_notifications_one(object: $object) {
    id
    status
  }
}
`;
