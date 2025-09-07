/*...........query...........*/

export const getPartnerCategories = `
    query PartnerCategoryQuerying($partner_id: uuid!)  {
        category(where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}, menus: {_not: {deletion_status: {_eq: 1}}}}, limit: 100) {
            id
            name
            is_active
        }
    }
`;

export const getCategory = `
  query GetCategory(
    $name: String!
    $name_with_space: String!
    $name_with_underscore: String!
    $partner_id: uuid!
  ) {
    category(
      where: {
        _and: [
          { partner_id: { _eq: $partner_id } }
          { deletion_status: { _eq: 0 } }
          {
            _or: [
              { name: { _ilike: $name } }
              { name: { _ilike: $name_with_space } }
              { name: { _ilike: $name_with_underscore } }
            ]
          }
        ]
      }
    ) {
      id
      name
      is_active
    }
  }
`;

/*...........mutation...........*/

export const addCategory = `
    mutation CategoryCreation($category: [category_insert_input!]!) {
        insert_category(objects: $category) {
            returning {
                name
                id
            }
        }
    }
`;
