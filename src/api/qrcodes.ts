export const GET_QR_TABLE = `
query GetQrTable($id: uuid!) {
  qr_codes(where: {id: {_eq: $id}}) {
    table_number,
    table_name,
    partner_id
    qr_group {
      extra_charge
      name
      charge_type
    }
  }
}`;

export const GET_QR_CODES_WITH_GROUPS_BY_PARTNER = `
  query GetQrCodesWithGroupsByPartner($partner_id: uuid!) {
    qr_codes(where: {partner_id: {_eq: $partner_id}}) {
      id
      qr_number
      table_number
      no_of_scans
      qr_group {
        id
        name
        extra_charge
        charge_type
      }
    }
  }
`;

export const INCREMENT_QR_CODE_SCAN_COUNT = `
mutation IncrementQrCodeScanCount($id: uuid!) {
  update_qr_codes_by_pk(pk_columns: {id: $id}, _inc: {no_of_scans: 1}) {
    id
    no_of_scans
  }
}`;

export const GET_QR_CODES_BY_PARTNER = `
  query GetQrCodesByPartner($partner_id: uuid!) {
    qr_codes(where: {partner_id: {_eq: $partner_id}}) {
      id
      qr_number
      table_number
      table_name
      no_of_scans
    }
  }
`;

export const INSERT_QR_CODE = `
  mutation InsertQrCode($object: qr_codes_insert_input!) {
    insert_qr_codes_one(object: $object) {
      id
      qr_number
      table_number
      partner_id
      no_of_scans
    }
  }
`;

export const BULK_INSERT_QR_CODES = `
  mutation InsertMultipleQRCodes($objects: [qr_codes_insert_input!]!) {
    insert_qr_codes(objects: $objects) {
      returning {
        id
        qr_number
        table_number
        partner_id
        no_of_scans
      }
    }
  }`;

export const UPDATE_QR_CODE = `
  mutation UpdateQrCode($id: uuid!, $changes: qr_codes_set_input!) {
    update_qr_codes_by_pk(pk_columns: {id: $id}, _set: $changes) {
      id
      qr_number
      table_number
      no_of_scans
    }
  }
`;

export const DELETE_QR_CODE = `
  mutation DeleteQrCode($id: uuid!) {
    delete_qr_codes_by_pk(id: $id) {
      id
    }
  }
`;
