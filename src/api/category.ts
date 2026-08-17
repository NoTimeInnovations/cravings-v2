/*...........query...........*/

export const getPartnerCategories = `
    query PartnerCategoryQuerying($partner_id: uuid!)  {
        category(where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}, menus: {_not: {deletion_status: {_eq: 1}}}}, limit: 100) {
            id
            name
            priority
            is_active
            visibility_config
            parent_id
        }
    }
`;

/**
 * Every category a partner owns, INCLUDING ones with no menu items.
 *
 * `getPartnerCategories` above filters on `menus: {_not: ...}`, so a category
 * with nothing in it is invisible to it. That is fine for the admin item
 * pickers, but a PARENT category ("Mess") normally holds no items itself — its
 * children do — so it would vanish from the very list that has to render it as
 * a top-level chip. This query is the one to use whenever the category TREE
 * matters rather than just the categories that happen to contain something.
 */
export const getPartnerCategoryTree = `
    query PartnerCategoryTree($partner_id: uuid!) {
        category(
          where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}},
          order_by: {priority: asc},
          limit: 200
        ) {
            id
            name
            priority
            is_active
            visibility_config
            parent_id
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
                parent_id
            }
        }
    }
`;

/** Re-parent a category (or clear its parent by passing null). */
export const update_category_parent = `
  mutation UpdateCategoryParent($id: uuid!, $parent_id: uuid) {
    update_category_by_pk(pk_columns: { id: $id }, _set: { parent_id: $parent_id }) {
      id
      parent_id
    }
  }
`;
