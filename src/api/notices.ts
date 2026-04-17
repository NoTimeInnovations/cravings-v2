export const getNoticesQuery = `
  query GetNotices($partner_id: uuid!) {
    notices(
      where: { partner_id: { _eq: $partner_id } }
      order_by: { created_at: desc }
    ) {
      id
      partner_id
      image_url
      type
      is_active
      show_always
      button_text
      button_link
      starts_at
      expires_at
      priority
      created_at
    }
  }
`;

export const getActiveNoticesQuery = `
  query GetActiveNotices($partner_id: uuid!) {
    notices(
      where: {
        partner_id: { _eq: $partner_id }
        is_active: { _eq: true }
        _or: [
          { expires_at: { _is_null: true } }
          { expires_at: { _gt: "now()" } }
        ]
        _and: [
          { _or: [
            { starts_at: { _is_null: true } }
            { starts_at: { _lte: "now()" } }
          ]}
        ]
      }
      order_by: { priority: asc_nulls_last }
    ) {
      id
      image_url
      type
      show_always
      button_text
      button_link
      priority
    }
  }
`;

export const createNoticeMutation = `
  mutation CreateNotice($object: notices_insert_input!) {
    insert_notices_one(object: $object) {
      id
      partner_id
      image_url
      type
      is_active
      show_always
      button_text
      button_link
      starts_at
      expires_at
      priority
      created_at
    }
  }
`;

export const updateNoticeMutation = `
  mutation UpdateNotice($id: uuid!, $updates: notices_set_input!) {
    update_notices_by_pk(pk_columns: { id: $id }, _set: $updates) {
      id
      is_active
    }
  }
`;

export const deleteNoticeMutation = `
  mutation DeleteNotice($id: uuid!) {
    delete_notices_by_pk(id: $id) {
      id
    }
  }
`;
