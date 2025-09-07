/*...........query...........*/

export const getClaimedOffersByOfferId = `
    query getClaimedOffersByOfferId($user_id: uuid! ,$offer_id: uuid!) {
        offers_claimed(where: {user_id: {_eq: $user_id}, offer_id: {_eq: $offer_id}}) {
            id
            claimed_time
            offer_id
            user_id
            partner_id
            offer {
            id
            offer_price
            end_time
            enquiries
            items_available
            start_time
            menu {
                category {
                name
                }
                description
                image_url
                name
                price
                id
            }
            partner {
                district
                store_name
                id
            }
            }
        }
        }
`;

/*...........mutation...........*/
export const addClaimedOffer = `
mutation AddClaimedOffer($claimed_time: timestamptz!, $offer_id: uuid!, $user_id: uuid!, $partner_id: uuid!) {
  insert_offers_claimed(objects: {
    claimed_time: $claimed_time,
    offer_id: $offer_id,
    user_id: $user_id,
    partner_id: $partner_id
  }) {
    returning {
      id
      claimed_time
      offer_id
      user_id
      partner_id
      offer {
        id
        offer_price
        end_time
        enquiries
        items_available
        start_time
        menu {
          category {
            name
          }
          description
          image_url
          name
          price
          id
        }
        partner {
          district
          store_name
          id
        }
      }
    }
  }
}
`;
