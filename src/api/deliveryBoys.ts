// Delivery Boys CRUD queries/mutations

export const getDeliveryBoysQuery = `
  query GetDeliveryBoys($partner_id: uuid!) {
    delivery_boys(where: {partner_id: {_eq: $partner_id}}, order_by: {created_at: desc}) {
      id
      name
      phone
      is_active
      partner_id
      created_at
    }
  }
`;

export const getActiveDeliveryBoysQuery = `
  query GetActiveDeliveryBoys($partner_id: uuid!) {
    delivery_boys(where: {partner_id: {_eq: $partner_id}, is_active: {_eq: true}}) {
      id
      name
      phone
    }
  }
`;

export const createDeliveryBoyMutation = `
  mutation CreateDeliveryBoy($name: String!, $phone: String!, $password: String!, $partner_id: uuid!) {
    insert_delivery_boys_one(object: {
      name: $name,
      phone: $phone,
      password: $password,
      partner_id: $partner_id
    }) {
      id
      name
      phone
      is_active
      partner_id
    }
  }
`;

export const updateDeliveryBoyMutation = `
  mutation UpdateDeliveryBoy($id: uuid!, $name: String!, $phone: String!, $is_active: Boolean!) {
    update_delivery_boys_by_pk(
      pk_columns: {id: $id},
      _set: {name: $name, phone: $phone, is_active: $is_active}
    ) {
      id
      name
      phone
      is_active
    }
  }
`;

export const updateDeliveryBoyPasswordMutation = `
  mutation UpdateDeliveryBoyPassword($id: uuid!, $password: String!) {
    update_delivery_boys_by_pk(
      pk_columns: {id: $id},
      _set: {password: $password}
    ) {
      id
    }
  }
`;

export const deleteDeliveryBoyMutation = `
  mutation DeleteDeliveryBoy($id: uuid!) {
    update_orders(
      where: {delivery_boy_id: {_eq: $id}}
      _set: {delivery_boy_id: null, assigned_at: null}
    ) {
      affected_rows
    }
    delete_delivery_boys_by_pk(id: $id) {
      id
    }
  }
`;

export const loginDeliveryBoyQuery = `
  query LoginDeliveryBoy($phone: String!, $password: String!) {
    delivery_boys(where: {phone: {_eq: $phone}, password: {_eq: $password}, is_active: {_eq: true}}, limit: 1) {
      id
      name
      phone
      partner_id
      partner {
        store_name
        currency
      }
    }
  }
`;

export const assignDeliveryBoyMutation = `
  mutation AssignDeliveryBoy($order_id: uuid!, $delivery_boy_id: uuid!) {
    update_orders_by_pk(
      pk_columns: {id: $order_id},
      _set: {
        delivery_boy_id: $delivery_boy_id,
        status: "dispatched",
        assigned_at: "now()"
      }
    ) {
      id
      status
      delivery_boy_id
      assigned_at
    }
  }
`;

export const updateDeliveryBoyLocationMutation = `
  mutation UpdateDeliveryBoyLocation($id: uuid!, $current_lat: float8!, $current_lng: float8!) {
    update_delivery_boys_by_pk(
      pk_columns: {id: $id},
      _set: {
        current_lat: $current_lat,
        current_lng: $current_lng,
        location_updated_at: "now()"
      }
    ) {
      id
      current_lat
      current_lng
      location_updated_at
    }
  }
`;

export const markOrderDeliveredMutation = `
  mutation MarkOrderDelivered($order_id: uuid!, $status_history: jsonb!) {
    update_orders_by_pk(
      pk_columns: {id: $order_id},
      _set: {
        status: "completed",
        status_history: $status_history,
        delivered_at: "now()"
      }
    ) {
      id
      status
      delivered_at
    }
  }
`;

export const getDeliveryBoyByIdQuery = `
  query GetDeliveryBoyById($id: uuid!) {
    delivery_boys_by_pk(id: $id) {
      id
      name
      phone
      partner_id
    }
  }
`;
