export const uploadCommonOffer = `
mutation InsertCommonOffer(
  $partner_name: String!
  $item_name: String!
  $price: Int!
  $location: String
  $description: String
  $insta_link: String
  $image_url: String
  $likes: Int
  $district: String!
  $coordinates: geography!
  $image_urls: jsonb = []
) {
  insert_common_offers_one(
    object: {
      partner_name: $partner_name
      item_name: $item_name
      price: $price
      location: $location
      description: $description
      insta_link: $insta_link
      image_url: $image_url
      likes: $likes
      district: $district
      created_at: "now()"
      coordinates: $coordinates
      image_urls: $image_urls
    }
  ) {
    id
    partner_name
    item_name
    likes
    price
    location
    description
    insta_link
    image_url
    district
    created_at
    coordinates
    image_urls
  }
}`;

export const getAllCommonOffers = (location?: { lat: number; lng: number }) => {
  // if (location) {
  return `
  query GetAllCommonOffers(
    $user_lat: float8,
    $user_lng: float8,
    $limit_count: Int,
    $offset_count: Int,
    $max_distance: Int = 100000000,
    $district_filter: String,
    $search_query: String
  ) {
    get_offers_near_location(
      args: {
        user_lat: $user_lat,
        user_lng: $user_lng,
        max_distance: $max_distance,
        limit_count: $limit_count,
        offset_count: $offset_count
        district_filter: $district_filter,
        search_query: $search_query
      }
    ) {
      distance_meters(args: {user_lat: $user_lat, user_lng: $user_lng})
      id
      partner_name
      item_name
      price
      image_url
      district
      partner_id
      partner {
        id
      }
      created_at
      coordinates
    }
    get_offers_near_location_aggregate(
      args: {
        user_lat: $user_lat,
        user_lng: $user_lng,
        max_distance: $max_distance
        district_filter: $district_filter,
        search_query: $search_query
      }
    ) {
      aggregate {
        count
      }
    }
  }
  `;
  //   } else {
  //     return `
  //    query GetAllCommonOffers($limit_count: Int, $offset_count: Int, $district: String = "", $search_query: String = "") {
  //     common_offers: common_offers(order_by: {created_at: desc}, limit: $limit_count, offset: $offset_count, where: {district: {_ilike: $district}, _or: [{partner_name: {_ilike: $search_query}}, {item_name: {_ilike: $search_query}}]}) {
  //       id
  //       partner_name
  //       item_name
  //       price
  //       image_url
  //       district
  //       created_at
  //     }
  //     common_offers_aggregate: common_offers_aggregate(where: {district: {_eq: $district}, _or: [{partner_name: {_ilike: $search_query}}, {item_name: {_ilike: $search_query}}]}) {
  //       aggregate {
  //         count
  //       }
  //     }
  //   }
  // `;
  //   }
};

export const getCommonOffersWithDistance = `
  query GetCommonOffersWithDistance(
    $userLat: Float!
    $userLon: Float!
    $limit: Int!
    $offset: Int!
  ) {
    common_offers(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      partner_name
      item_name
      price
      image_url
      district
      distance: offer_distance(
        coordinates,
        $userLat,
        $userLon
      ) / 1000 
    }
  }
`;

export const getAllCommonOffersAllFields = `
  query GetAllCommonOffers($limit: Int , $offset: Int) {
    common_offers(order_by: {created_at: desc} , limit: $limit, offset: $offset) {
      id
      partner_name
      item_name
      price
      location
      description
      insta_link
      likes
      image_url
      district
      created_at
    }
    common_offers_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const getCommonOfferById = `
query GetCommonOfferById($id: uuid!, $user_id: String) {
  common_offers_by_pk(id: $id) {
    id
    partner_name
    item_name
    price
    location
    description
    coordinates
    insta_link
    image_url
    view_count
    image_urls
    partner_id
    no_of_likes
    no_of_views
    district
    created_at
    common_offers_liked_bies(where: {user_id: {_eq: $user_id}}) {
      user_id
    }
    common_offers_viewed_bies(where: {user_id: {_eq: $user_id}}) {
      user_id
    }
    partner {
      store_name
      district
      whatsapp_numbers
      phone
      country_code
      location
      common_offers(where: {id: {_neq: $id}}) {
        id
        partner_name
        item_name
        price
        location
        description
        coordinates
        insta_link
        image_url
        view_count
        image_urls
        partner_id
        no_of_likes
        no_of_views
        district
        created_at
        common_offers_liked_bies(where: {user_id: {_eq: $user_id}}) {
          user_id
        }
        common_offers_viewed_bies(where: {user_id: {_eq: $user_id}}) {
          user_id
        }
      }
    }
  }
}
`;

export const deleteCommonOffer = `
  mutation DeleteCommonOffer($id: uuid!) {
    delete_common_offers_by_pk(id: $id) {
      id
      image_url
      image_urls
    }
}`;

export const updateCommonOffer = `
  mutation UpdateCommonOffer( $object: common_offers_set_input!, $id: uuid!) {
    update_common_offers_by_pk(pk_columns: {id: $id}, _set: $object) {
      id
      partner_name
      item_name
      price
      location
      description
      insta_link
      image_url
      likes
      district
      created_at
      coordinates
    }
  }`;

export const searchCommonOffers = `
  query SearchCommonOffers($searchTerm: String!, $limit: Int!, $offset: Int!) {
    common_offers(
      where: {
        _or: [
          { partner_name: { _ilike: $searchTerm } },
          { item_name: { _ilike: $searchTerm } },
          { location: { _ilike: $searchTerm } },
          { district: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } }
        ]
      },
      limit: $limit,
      offset: $offset,
      order_by: { created_at: desc }
    ) {
      id
      partner_name
      item_name
      price
      location
      description
      insta_link
      likes
      image_url
      district
      coordinates
      created_at
    }
  }
`;
