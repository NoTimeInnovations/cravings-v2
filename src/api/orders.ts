//query

export const getOrdersOfPartnerQuery = `
  query GetOrdersOfPartner($partner_id: uuid!) {
    orders(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
    ) {
      id
      total_price
      created_at
      table_number
      type
      delivery_address
      status
      partner_id
}
}`;

//mutation
export const createOrderMutation = `
  mutation CreateOrder(
    $id: uuid,
    $totalPrice: float8!,
    $createdAt: timestamptz!,
    $tableNumber: Int,
    $qrId: uuid,
    $partnerId: uuid!,
    $userId: uuid,
    $type: String!,
    $delivery_address: String,
    $phone: String,
    $status: String,
    $gst_included: numeric,
    $extra_charges: jsonb,
    $orderedby: String,
    $delivery_location: geography,
    $captain_id: uuid,
    $notes: String,
    $display_id: String,
    $table_name: String
  ) {
    insert_orders_one(object: {
      id: $id
      total_price: $totalPrice
      created_at: $createdAt
      table_number: $tableNumber
      qr_id: $qrId
      partner_id: $partnerId
      user_id: $userId
      status: $status
      type: $type
      phone: $phone
      delivery_address: $delivery_address
      gst_included: $gst_included
      extra_charges: $extra_charges
      orderedby: $orderedby
      delivery_location: $delivery_location
      captain_id: $captain_id
      notes: $notes
      display_id: $display_id
      table_name: $table_name
    }) {
      id
      total_price
      created_at
    }
  }
`;

export const createOrderItemsMutation = `
                  mutation CreateOrderItems($orderItems: [order_items_insert_input!]!) {
                    insert_order_items(objects: $orderItems) {
                      affected_rows
                    }
                  }
`;

export const createOrderWithItemsMutation = `
  mutation CreateOrderWithItems(
    $id: uuid,
    $totalPrice: float8!,
    $createdAt: timestamptz!,
    $tableNumber: Int,
    $qrId: uuid,
    $partnerId: uuid!,
    $userId: uuid,
    $type: String!,
    $delivery_address: String,
    $phone: String,
    $status: String,
    $gst_included: numeric,
    $extra_charges: jsonb,
    $orderedby: String,
    $delivery_location: geography,
    $captain_id: uuid,
    $notes: String,
    $display_id: String,
    $table_name: String,
    $orderItems: [order_items_insert_input!]!
  ) {
    insert_orders_one(object: {
      id: $id
      total_price: $totalPrice
      created_at: $createdAt
      table_number: $tableNumber
      qr_id: $qrId
      partner_id: $partnerId
      user_id: $userId
      status: $status
      type: $type
      phone: $phone
      delivery_address: $delivery_address
      gst_included: $gst_included
      extra_charges: $extra_charges
      orderedby: $orderedby
      delivery_location: $delivery_location
      captain_id: $captain_id
      notes: $notes
      display_id: $display_id
      table_name: $table_name

      order_items: {
        data: $orderItems
      }
    }) {
      id
      total_price
      created_at
      order_items {
        id,
        item
      }
    }
  }
`;

export const updateOrderMutation = `
  mutation UpdateOrder(
    $id: uuid!,
    $totalPrice: float8,
    $phone: String,
    $tableNumber: Int,
    $extraCharges: jsonb,
    $notes: String
  ) {
    update_orders_by_pk(
      pk_columns: { id: $id }
      _set: {
        total_price: $totalPrice,
        phone: $phone,
        table_number: $tableNumber,
        extra_charges: $extraCharges,
        notes: $notes
      }
    ) {
      id
      total_price
      table_number
      extra_charges
      notes
    }
  }
`;

export const cancelOrderMutation = `
  mutation CancelOrder(
    $orderId: uuid!
  ) {
    update_orders_by_pk(
      pk_columns: { id: $orderId }
      _set: {
        status: "cancelled"
      }
    ) {
      id
      status
    }
  }
`;

export const updateOrderItemsMutation = `
  mutation UpdateOrderItems($orderId: uuid!, $items: [order_items_insert_input!]!) {
    delete_order_items(where: { order_id: { _eq: $orderId } }) {
      affected_rows
    }

    insert_order_items(objects: $items) {
      affected_rows
    }
  }
`;

export const getOrderByIdQuery = `
  query GetOrderById($orderId: uuid!) {
    orders_by_pk(id: $orderId) {
      id
      total_price
      created_at
      table_number
      type
      delivery_address
      status
      phone
      partner_id
      notes
      gst_included
      extra_charges
      captainid {
        id
        name
        email
      }
      order_items {
        id
        quantity
        menu {
          id
          name
          price
          category {
            name
          }
        }
      }
    }
  }
`;

// subscription

export const subscriptionQuery = `
subscription GetPartnerOrders($partner_id: uuid!, $today_start: timestamptz!, $today_end: timestamptz!) {
  orders(
    where: { 
      partner_id: { _eq: $partner_id },
      _or: [
        { orderedby: { _is_null: true } },
        { orderedby: { _eq: "captain" } }
      ],
      created_at: { _gte: $today_start, _lte: $today_end }
    }
    order_by: { created_at: desc }
  ) {
    id
    total_price
    created_at
    table_number
    notes
    qr_id
    type
    delivery_address
    delivery_location
    status
    status_history
    partner_id
    gst_included
    extra_charges
    phone
    user_id
    orderedby
    display_id
    captain_id
    captainid {
      id
      name
      email
    }
    user {
      full_name
      phone
      email
    }
    order_items {
      id
      quantity
      item
      menu {
        id
        name
        price
        category {
          id
          name
          priority
        }
        description
        image_url
        is_top
        is_available
        priority
        stocks {
          stock_quantity
          id
        }
      }
    }
  }
}
`;

export const paginatedOrdersSubscription = `
subscription GetPaginatedPartnerOrders(
  $partner_id: uuid!
  $limit: Int!
  $offset: Int!
  $today_start: timestamptz!
  $today_end: timestamptz!
) {
  orders(
    where: { 
      partner_id: { _eq: $partner_id },
      _or: [
        { orderedby: { _is_null: true } },
        { orderedby: { _eq: "captain" } }
      ],
      created_at: { _gte: $today_start, _lte: $today_end }
    }
    order_by: { created_at: desc }
    limit: $limit
    offset: $offset
  ) {
    id
    total_price
    created_at
    table_number
    notes
    qr_id
    type
    delivery_address
    delivery_location
    status
    status_history
    partner_id
    gst_included
    extra_charges
    phone
    display_id
    user_id
    orderedby
    captain_id
    qr_code {
      table_name
    }
    captainid {
      id
      name
      email
    }
    user {
      full_name
      phone
      email
    }
    order_items {
      id
      quantity
      item
      menu {
        id
        name
        price
        category {
          id
          name
          priority
        }
        description
        image_url
        is_top
        is_available
        priority
        stocks {
          stock_quantity
          id
        }
      }
    }
  }
}
`;

export const ordersCountSubscription = `
subscription GetOrdersCount($partner_id: uuid!) {
  orders_aggregate(
    where: { 
      partner_id: { _eq: $partner_id },
      _or: [
        { orderedby: { _is_null: true } },
        { orderedby: { _eq: "captain" } }
      ]
    }
  ) {
    aggregate {
      count
    }
  }
}
`;

export const userSubscriptionQuery = `
subscription GetUserOrders($user_id: uuid!) {
  orders(
    where: { user_id: { _eq: $user_id } }
    order_by: { created_at: desc }
  ) {
    id
    total_price
    created_at
    table_number
    qr_id
    type
    delivery_address
    delivery_location
    table_name
    qr_code {
      table_name
    }
    notes
    status
    status_history
    partner_id
    partner {
      gst_percentage
      currency
      store_name
    }
    gst_included
    extra_charges
    phone
    user_id
    user {
      full_name
      phone
      email
    }
    partner {
      name
    }
    order_items {
      id
      quantity
      item
      menu {
        category {
          name
        }
      }
    }
  }
}
`;

// Add a new query to fetch captains
export const getCaptainsQuery = `
  query GetCaptains($captain_ids: [uuid!]!) {
    captain(where: {id: {_in: $captain_ids}}) {
      id
      name
      email
    }
  }
`;
