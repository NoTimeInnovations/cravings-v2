/*...........query...........*/

export const getNearByPartnersQuery = `
query GetNearByPartners(
  $user_lat: float8!,
  $user_lng: float8!,
  $limit: Int,
  $offset: Int,
  $district_filter: String = "%",
  $search_query: String = "%",
  $business_type: String = "restaurant",
  $status: String = "active"
) {
  get_all_partners(
    args: {
      user_lat: $user_lat,
      user_lng: $user_lng,
      result_limit: $limit,
      result_offset: $offset,
      district_filter: $district_filter,
      search_query: $search_query,
      business_type_filter: $business_type,
      status_filter: $status
    }
  ) {
    id
    store_name
    location
    description
    district
    store_banner
    distance_meters(args: {user_lat: $user_lat, user_lng: $user_lng})
  }
  
  get_all_partners_aggregate(
    args: {
      user_lat: $user_lat,
      user_lng: $user_lng,
      district_filter: $district_filter,
      search_query: $search_query,
      business_type_filter: $business_type,
      status_filter: $status
    }
  ) {
    aggregate {
      count
    }
  }
}
`;

export const getAllPartnersQuery = `
query GetAllPartners($limit: Int, $offset: Int, $district: String = "%", $query: String = "") {
  partners(
    where: {
      status: {_eq: "active"}, 
      _and: [
        {
          _or: [
            {district: {_ilike: $district}},
            {district: {_is_null: true}}
          ]
        },
        {
          _or: [
            {store_name: {_ilike: $query}},
            {location: {_ilike: $query}},
            {description: {_ilike: $query}}
          ]
        }
      ]
    }, 
    order_by: {store_name: asc}, 
    limit: $limit, 
    offset: $offset
  ) {
    id 
    store_name
    location
    description
    district
    store_banner
  }
  partners_aggregate(
    where: {
      status: {_eq: "active"}, 
      _and: [
        {
          _or: [
            {district: {_ilike: $district}},
            {district: {_is_null: true}}
          ]
        },
        {
          _or: [
            {store_name: {_ilike: $query}},
            {location: {_ilike: $query}},
            {description: {_ilike: $query}}
          ]
        }
      ]
    }
  ) {
    aggregate {
      count
    }
  }
}`;

export const getPartnerByIdQuery = `
  query GetPartnerDsitricts() {
    partners {
      district
    }
  }
  `;



export const getPartnerAndOffersQuery = `
query GetPartnerAndOffersQuery($id: uuid! , $offer_types: [String!]) {
  partners(where: {id: {_eq: $id}}) {
    district
    location
    delivery_status
    id
    description
    geo_location
    delivery_rate
    feature_flags
    phone
    location_details
    whatsapp_numbers
    store_banner
    social_links
    footnote
    status
    store_name
    is_shop_open
    currency
    place_id
    theme
    gst_no
    gst_percentage
    geo_location
    country
    country_code
    delivery_rate
    business_type
    delivery_rules
    menus(where: {
    deletion_status: {_eq: 0},
    is_available: {_eq: true},
    _and: [
      {
        category: {
          _or: [
            {is_active: {_eq: true}},
            {name: {_eq: "custom"}}
          ]
        }
      }
    ]
  }) {
      category {
        name
        id
        priority
        is_active
      }
      priority
      description
      variants
      id
      image_url
      is_top
      is_available
      is_price_as_per_size
      name
      price
      offers(where: {_and: [{ offer_type : { _in : $offer_types } } ,{end_time: {_gt: "now()"}}, {deletion_status: {_eq: 0}}]}) {
        offer_price
      }
      stocks{
        stock_quantity
        stock_type
        show_stock
      }
    }
    offers(where: {_and: [{ offer_type : { _in : $offer_types } } ,{end_time: {_gt: "now()"}}, {deletion_status: {_eq: 0}}]}) {
      end_time
      enquiries
      id
      image_urls
      menu {
        image_url
        description
        name
        id
        price
        variants
      }
      offer_price
      offer_type
      start_time
      variant
    }
  }
}
`;

export const getInactivePartnersQuery = `
  query GetInactivePartnersWithoutSubscription {
  partners(where: {status: {_eq: "inactive"}, _not: {partner_subscriptions: {}}}) {
    id
    name
    email
    store_name
    location
    status
    upi_id
    description
    phone
    district
  }
}
`;

export const getAllPartnerUpiIdsQuery = `
  query GetAllPartnerUpiIds {
    partners {
      id
      upi_id
      store_name
    }
  }
`;

export const getPartnerSubscriptionQuery = `
query GetLastSubscription($partnerId: uuid!) {
  partner_subscriptions(
    where: { partner_id: { _eq: $partnerId } },
    order_by: { expiry_date: desc },
    limit: 1
  ) {
    id
    expiry_date
}
}`;

/*...........mutation...........*/

export const updatePartnerMutation = `
  mutation UpdatePartner(
    $id: uuid!
    $updates: partners_set_input!
  ) {
    update_partners_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      status
      delivery_status
      upi_id
      store_banner
      place_id
      theme
      description
      currency
      feature_flags
      gst_no
      gst_percentage
      whatsapp_numbers
    }
  }
`;

/*...........types...........*/

export interface Partner {
  id: string;
  name: string;
  email: string;
  store_name: string;
  location: string;
  status: string;
  upi_id: string;
  description: string;
  phone?: string;
  district?: string;
}

export interface UpdatePartnerStatusResponse {
  update_partners_by_pk: {
    id: string;
    status: string;
  };
}
