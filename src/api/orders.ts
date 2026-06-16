//query

export const getOrdersOfPartnerQuery = `
  query GetOrdersOfPartner($partner_id: uuid!) {
    orders(
      where: { partner_id: { _eq: $partner_id }, status: { _nin: ["pending_payment", "expired"] } }
      order_by: { created_at: desc }
    ) {
      id
      total_price
      created_at
      table_number
      type
      scheduled_date
      scheduled_time
      scheduled_time_to
      booking_persons
      qr_id
      delivery_address
      status
      partner_id
      display_id
      table_name
      payment_method
      order_channel
      notes
      gst_included
      extra_charges
      discounts
      loyalty_points_redeemed
      loyalty_redeem_value
      loyalty_points_earned
      phone
      captain_id
      order_items {
        id
        quantity
        item
      }
    }
  }
`;

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
    $table_name: String,
    $payment_method: String,
    $discounts: jsonb,
    $source: String
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
      payment_method: $payment_method
      discounts: $discounts
      source: $source
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
    $short_id: String,
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
    $orderItems: [order_items_insert_input!]!,
    $discounts: jsonb,
    $source: String,
    $cashfree_order_id: String,
    $scheduled_date: date,
    $scheduled_time: time
    $scheduled_time_to: time
    $booking_persons: Int
    $order_channel: String
  ) {
    insert_orders_one(object: {
      id: $id
      short_id: $short_id
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
      discounts: $discounts
      source: $source
      cashfree_order_id: $cashfree_order_id
      scheduled_date: $scheduled_date
      scheduled_time: $scheduled_time
      scheduled_time_to: $scheduled_time_to
      booking_persons: $booking_persons
      order_channel: $order_channel

      order_items: {
        data: $orderItems
      }
    }) {
      id
      short_id
      total_price
      created_at
      scheduled_date
      scheduled_time
      scheduled_time_to
      booking_persons
      order_items {
        id,
        item
      }
    }
  }
`;

/**
 * Insert an online (Cashfree) order that has NOT been paid yet, so it is
 * persisted server-side BEFORE payment. The webhook / reconciler cron can then
 * finalize it (mark paid, push to Petpooja, notify) even if the customer never
 * returns to the app. Differs from createOrderWithItemsMutation by also setting
 * payment_method/payment_status/is_paid and stashing the prebuilt Petpooja
 * push payload in cf_pp_payload (petpooja partners only). status is expected to
 * be "pending_payment" so partner-facing views can hide it until paid.
 */
export const createPendingOrderWithItemsMutation = `
  mutation CreatePendingOrderWithItems(
    $id: uuid,
    $short_id: String,
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
    $orderItems: [order_items_insert_input!]!,
    $discounts: jsonb,
    $source: String,
    $cashfree_order_id: String,
    $scheduled_date: date,
    $scheduled_time: time,
    $scheduled_time_to: time,
    $booking_persons: Int,
    $payment_method: String,
    $payment_status: String,
    $is_paid: Boolean,
    $cf_pp_payload: jsonb,
    $order_channel: String
  ) {
    insert_orders_one(object: {
      id: $id
      short_id: $short_id
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
      discounts: $discounts
      source: $source
      cashfree_order_id: $cashfree_order_id
      scheduled_date: $scheduled_date
      scheduled_time: $scheduled_time
      scheduled_time_to: $scheduled_time_to
      booking_persons: $booking_persons
      payment_method: $payment_method
      payment_status: $payment_status
      is_paid: $is_paid
      cf_pp_payload: $cf_pp_payload
      order_channel: $order_channel
      order_items: {
        data: $orderItems
      }
    }) {
      id
      short_id
      total_price
      created_at
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
    $discounts: jsonb,
    $notes: String
  ) {
    update_orders_by_pk(
      pk_columns: { id: $id }
      _set: {
        total_price: $totalPrice,
        phone: $phone,
        table_number: $tableNumber,
        extra_charges: $extraCharges,
        discounts: $discounts,
        notes: $notes
      }
    ) {
      id
      total_price
      table_number
      extra_charges
      discounts
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
      scheduled_date
      scheduled_time
      scheduled_time_to
      booking_persons
      delivery_address
      status
      phone
      partner_id
      notes
      gst_included
      extra_charges
      discounts
      captainid {
        id
        name
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
      status: { _nin: ["pending_payment", "expired"] },
      created_at: { _gte: $today_start, _lte: $today_end }
    }
    order_by: { created_at: desc }
  ) {
    id
    total_price
    created_at
    table_number
    table_name
    notes
    qr_id
    type
    scheduled_date
    scheduled_time
    scheduled_time_to
    booking_persons
    delivery_address
    delivery_location
    status
    status_history
    cancel_reason
    cancelled_by
    partner_id
    gst_included
    extra_charges
    discounts
    phone
    user_id
    orderedby
    display_id
    payment_method
    order_channel
    is_paid
    cashfree_payment_id
    captain_id
    captainid {
      id
      name
      email
    }
    delivery_boy_id
    assigned_at
    delivered_at
    delivery_boy {
      id
      name
      phone
      current_lat
      current_lng
      location_updated_at
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
) {
  orders(
    where: {
      partner_id: { _eq: $partner_id },
      status: { _nin: ["pending_payment", "expired"] },
      created_at: { _gte: $today_start }
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
    scheduled_date
    scheduled_time
    scheduled_time_to
    booking_persons
    delivery_address
    delivery_location
    status
    status_history
    cancel_reason
    cancelled_by
    partner_id
    gst_included
    extra_charges
    discounts
    payment_method
    order_channel
    is_paid
    cashfree_payment_id
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
    delivery_boy_id
    assigned_at
    delivered_at
    growjet_order_number
    delivery_agent
    delivery_provider
    delivery_provider_order_id
    delivery_provider_state
    delivery_provider_meta
    delivery_provider_last_event_at
    delivery_boy {
      id
      name
      phone
      current_lat
      current_lng
      location_updated_at
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
      status: { _nin: ["pending_payment", "expired"] }
    }
  ) {
    aggregate {
      count
    }
  }
}
`;

// Draft (unpaid online) orders — status "pending_payment". Shown ONLY in the
// admin "Draft Orders" section, never in the normal order list / notifications.
export const draftOrdersSubscription = `
subscription GetDraftOrders($partner_id: uuid!, $since: timestamptz!) {
  orders(
    where: {
      partner_id: { _eq: $partner_id },
      status: { _eq: "pending_payment" },
      created_at: { _gte: $since }
    }
    order_by: { created_at: desc }
    limit: 50
  ) {
    id
    total_price
    created_at
    table_number
    notes
    qr_id
    type
    scheduled_date
    scheduled_time
    scheduled_time_to
    booking_persons
    delivery_address
    status
    partner_id
    display_id
    table_name
    payment_method
    order_channel
    phone
    user_id
    orderedby
    gst_included
    extra_charges
    discounts
    order_items {
      id
      quantity
      item
      menu {
        id
        name
        price
        image_url
        description
        category { name }
      }
    }
  }
}
`;

export const userSubscriptionQuery = `
subscription GetUserOrders($user_id: uuid!) {
  orders(
    where: { user_id: { _eq: $user_id }, status: { _neq: "expired" } }
    order_by: { created_at: desc }
  ) {
    id
    total_price
    created_at
    table_number
    qr_id
    type
    scheduled_date
    scheduled_time
    scheduled_time_to
    booking_persons
    delivery_address
    delivery_location
    table_name
    qr_code {
      table_name
    }
    notes
    status
    status_history
    cancel_reason
    cancelled_by
    is_paid
    display_id
    partner_id
    partner {
      gst_percentage
      currency
      country
      store_name
    }
    gst_included
    extra_charges
    discounts
    phone
    user_id
    delivery_boy_id
    assigned_at
    delivered_at
    delivery_boy {
      id
      name
      phone
      current_lat
      current_lng
      location_updated_at
    }
    delivery_provider
    delivery_provider_state
    delivery_provider_meta
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
    reviews {
      id
      rating
      comment
      created_at
    }
  }
}
`;

// Real-time subscription for the user's most recent orders WITH a single
// partner. Used by CompactOrders. Drops live-tracking fields (delivery_boy
// gps) that fire on every rider tick — the list view doesn't show those.
export const userPartnerOrdersSubscription = `
subscription UserPartnerOrders($user_id: uuid!, $partner_id: uuid!, $limit: Int!) {
  orders(
    where: { user_id: { _eq: $user_id }, partner_id: { _eq: $partner_id }, status: { _neq: "expired" } }
    order_by: { created_at: desc }
    limit: $limit
  ) {
    id
    total_price
    created_at
    status
    is_paid
    display_id
    partner_id
    partner {
      gst_percentage
      currency
      country
      store_name
      name
    }
    gst_included
    extra_charges
    discounts
    order_items {
      id
      quantity
      item
      menu {
        category {
          name
          id
        }
      }
    }
    reviews(limit: 1) {
      id
      rating
      comment
      created_at
    }
  }
}
`;

// One-shot paginated fetch for older pages. Same shape as the subscription.
export const userPartnerOrdersPageQuery = `
query UserPartnerOrdersPage($user_id: uuid!, $partner_id: uuid!, $limit: Int!, $offset: Int!) {
  orders(
    where: { user_id: { _eq: $user_id }, partner_id: { _eq: $partner_id }, status: { _neq: "expired" } }
    order_by: { created_at: desc }
    limit: $limit
    offset: $offset
  ) {
    id
    total_price
    created_at
    status
    is_paid
    display_id
    partner_id
    partner {
      gst_percentage
      currency
      country
      store_name
      name
    }
    gst_included
    extra_charges
    discounts
    order_items {
      id
      quantity
      item
      menu {
        category {
          name
          id
        }
      }
    }
    reviews(limit: 1) {
      id
      rating
      comment
      created_at
    }
  }
}
`;

// Most recent order a customer placed at a given partner, with everything the
// WhatsApp "Reorder" flow needs to rebuild the cart + checkout: line items
// (menu_id + item snapshot, variant encoded in item.id), order type, delivery
// address and location.
export const userPartnerLastOrderQuery = `
query UserPartnerLastOrder($user_id: uuid!, $partner_id: uuid!) {
  orders(
    where: {
      user_id: { _eq: $user_id }
      partner_id: { _eq: $partner_id }
      status: { _nin: ["expired", "cancelled"] }
    }
    order_by: { created_at: desc }
    limit: 1
  ) {
    id
    created_at
    type
    delivery_address
    delivery_location
    order_items {
      menu_id
      quantity
      item
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


