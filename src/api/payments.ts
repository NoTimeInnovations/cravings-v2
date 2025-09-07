// GraphQL queries and mutations
export const GET_HOTEL_DETAILS = `
  query GetHotelDetails($qrCodeId: uuid!) {
    qr_codes(where: { id: { _eq: $qrCodeId } }) {
      partner_id
      partner {
        store_name
        district
      }
    }
  }
`;

export const GET_UPI_DETAILS = `
  query GetUpiDetails($partnerId: uuid!) {
    partners(where: { id: { _eq: $partnerId } }) {
      upi_id
    }
  }
`;

export const FOLLOW_PARTNER = `
  mutation FollowPartner($userId: uuid!, $partnerId: uuid!, $phone: String!) {
    insert_followers_one(
      object: { user_id: $userId, partner_id: $partnerId, phone: $phone }
    ) {
      id
    }
  }
`;

export const IS_FOLLOWING = `
  query IsFollowing($userId: uuid!, $partnerId: uuid!) {
    followers(
      where: { user_id: { _eq: $userId }, partner_id: { _eq: $partnerId } }
      limit: 1
    ) {
      id
    }
  }
`;

export const GET_USER_VISITS = `
  query GetUserVisits($userId: uuid!, $partnerId: uuid!) {
    qr_codes(
      where: { user_id: { _eq: $userId }, partner_id: { _eq: $partnerId } }
      order_by: { createdAt: desc }
      limit: 1
    ) {
      id
      createdAt
      wasDiscounted
    }
  }
`;

export const CREATE_PAYMENT = `
  mutation CreatePayment(
    $partnerId: uuid!
    $amount: Int!
    $userId: uuid!
    $discount: Int!
  ) {
    insert_payments_one(
      object: {
        partner_id: $partnerId
        amount: $amount
        user_id: $userId
        discount: $discount
      }
    ) {
      id
    }
  }
`;