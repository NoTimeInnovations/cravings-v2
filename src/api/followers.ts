export const getFollowersQuery = `
query GetFollowers($userId: String!, $limit: Int, $offset: Int) {
  followers(
    where: { user_id: { _eq: $userId } },
    order_by: { created_at: desc },
    limit: $limit,
    offset: $offset
  ) {
    partner {
      id
      store_name
      district
      store_banner
      
    }
  }
  followers_aggregate(where: { user_id: { _eq: $userId } }) {
    aggregate {
      count
    }
  }
}`;