// GraphQL queries and mutations for POS operations

export const createPOSOrder = `
  mutation CreatePOSOrder($total_amt: Int!, $phone: Int, $pos_id: String!) {
    insert_pos_one(object: {
      total_amt: $total_amt,
      phone: $phone,
      pos_show_id : $pos_id
    }) {
      id
      total_amt
      phone
    }
  }
`;

export const createPOSItems = `
  mutation CreatePOSItems($items: [pos_items_insert_input!]!) {
    insert_pos_items(objects: $items) {
      returning {
        id
        menu_id
        pos_id
        quantity
      }
    }
  }
`;

export const getPastBills = `
  query GetPastBills ($user_id: uuid!) {
    pos(
      where: {user_id: {_eq: $user_id}}
      order_by: {created_at: desc}
    ) {
      id
      total_amt
      phone
      created_at
      pos_show_id
      pos_items {
        id
        menu_id
        quantity
        menu {
          name
          price
        }
      }
    }
  }
`;

export const deleteBillMutation = `
  mutation DeleteBill($id: uuid!) {
    delete_pos_items(where: {pos_id: {_eq: $id}}) {
      affected_rows
    }
    delete_pos_by_pk(id: $id) {
      id
    }
  }
`;