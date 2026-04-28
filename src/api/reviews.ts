export const insertOrderReviewMutation = `
mutation InsertOrderReview(
  $id: uuid!
  $order_id: uuid!
  $partner_id: uuid!
  $user_id: uuid!
  $rating: Int!
  $comment: String
) {
  insert_reviews_one(
    object: {
      id: $id
      order_id: $order_id
      partner_id: $partner_id
      user_id: $user_id
      rating: $rating
      comment: $comment
      type: "order"
      created_at: "now()"
    }
  ) {
    id
    rating
    comment
    created_at
  }
}
`;

export const getPartnerReviewsQuery = `
query GetPartnerReviews($partner_id: uuid!) {
  reviews(
    where: {
      partner_id: { _eq: $partner_id }
      type: { _eq: "order" }
    }
    order_by: { created_at: desc }
  ) {
    id
    rating
    comment
    created_at
    order_id
    user {
      full_name
      phone
    }
    order {
      id
      display_id
      type
      total_price
      created_at
    }
  }
}
`;
