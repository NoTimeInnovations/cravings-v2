/*...........query...........*/

export const getMenu = `
    query GetMenu($partner_id: uuid!)  {
        menu(where: {partner_id: {_eq: $partner_id} , deletion_status: {_eq: 0}} ) {
            id
            name
            category { 
                id
                name
                priority
            }
            image_url
            image_source
            variants
            partner_id
            priority
            is_price_as_per_size
            price
            offers {
              offer_price
            }
            description
            is_top
            is_available
        }
    }
`;

export const update_category = `
  mutation UpdateCategory($id: uuid!, $name: String, $priority: Int, $is_active: Boolean) {
    update_category_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, priority: $priority, is_active: $is_active }
    ) {
      id
      name
      priority
      is_active
    }
  }
`;

export const getCategoryImages = `
  query GetMenuCategoryImages($partner_id: uuid!, $category: String!) {
    menu(
      where: {
        category: { name: { _eq: $category } },
        partner_id: { _eq: $partner_id },
        image_url: { _neq: "", _is_null: false }
      },
      distinct_on: [image_url], 
      limit: 100
    ) {
      image_url
      image_source
      name
    }
  }
`;

/*...........mutation...........*/

export const addMenu = `
    mutation InsertMenu($menu: [menu_insert_input!]!) {
    insert_menu(objects: $menu) {
        returning {
            id
            name
            category { 
                id
                name
                priority
            }
            image_url
            image_source
            partner_id
            price
            description
            is_price_as_per_size
            is_top
            is_available
            variants
        }
    }
}`;

export const updateMenu = `
    mutation UpdateMenu($id: uuid!, $menu: menu_set_input!) {
        update_menu(where: {id: {_eq: $id}}, _set: $menu) {
            returning {
                id
            name
            category { 
                id
                name
                priority
            }
            image_url
            image_source
            partner_id
            price
            description
            is_top
            is_available
            }
        }
    }
`;

export const deleteMenu = `
    mutation UpdateMenuDeletionStatus($id: uuid!) {
        update_menu(where: {id: {_eq: $id}}, _set: {deletion_status: 1}) {
            returning {
                id
                deletion_status
            }
        }
    }
`;


export const delCategoryAndItems = `
  mutation DeleteCategoryAndItems($categoryId: uuid!, $partnerId: uuid!) {
    update_menu(
      where: {
        category_id: {_eq: $categoryId}, 
        partner_id: {_eq: $partnerId},
        deletion_status: {_neq: 1}
      },
      _set: { deletion_status: 1 }
    ) {
      affected_rows
    }
    
    update_category_by_pk(
      pk_columns: { id: $categoryId },
      _set: { deletion_status: 1 }
    ) {
      id
      deletion_status
    }
  }
`;