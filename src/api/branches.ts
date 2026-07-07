/*...........queries...........*/

export const getBranchByParentPartnerIdQuery = `
query GetBranchByParentPartnerId($parent_partner_id: uuid!) {
  branches(where: {parent_partner_id: {_eq: $parent_partner_id}}, limit: 1) {
    id
    name
    tagline
    parent_partner_id
    outlets(where: {status: {_eq: "active"}, hide_from_outlets: {_eq: false}}, order_by: {store_name: asc}) {
      id
      username
      store_name
      store_tagline
      store_banner
      location
      location_details
      phone
      geo_location
      status
      subscription_details
      delivery_rules
    }
  }
}
`;

export const getPartnerBranchInfoQuery = `
query GetPartnerBranchInfo($partner_id: uuid!) {
  partners_by_pk(id: $partner_id) {
    id
    branch_id
    branch {
      id
      name
      tagline
      whatsapp_source
      parent_partner_id
      parent_partner {
        id
        store_name
        username
      }
      outlets(order_by: {store_name: asc}) {
        id
        username
        store_name
        store_tagline
        location
        location_details
        phone
        status
        hide_from_outlets
      }
    }
  }
}
`;

/*...........mutations...........*/

export const createBranchMutation = `
mutation CreateBranch($name: String!, $parent_partner_id: uuid!, $tagline: String) {
  insert_branches_one(object: {name: $name, parent_partner_id: $parent_partner_id, tagline: $tagline}) {
    id
    name
    tagline
    parent_partner_id
  }
}
`;

export const updateBranchMutation = `
mutation UpdateBranch($id: uuid!, $updates: branches_set_input!) {
  update_branches_by_pk(pk_columns: {id: $id}, _set: $updates) {
    id
    name
    tagline
    parent_partner_id
  }
}
`;

export const disbandBranchMutation = `
mutation DisbandBranch($id: uuid!) {
  update_partners(where: {branch_id: {_eq: $id}}, _set: {branch_id: null}) {
    affected_rows
  }
  delete_branches_by_pk(id: $id) {
    id
  }
}
`;

export const setPartnerBranchMutation = `
mutation SetPartnerBranch($partner_id: uuid!, $branch_id: uuid) {
  update_partners_by_pk(pk_columns: {id: $partner_id}, _set: {branch_id: $branch_id}) {
    id
    branch_id
  }
}
`;

// WhatsApp status of a single partner (the main branch), for the branch-WhatsApp
// toggle in superadmin. Fetched separately because the array relationship isn't
// tracked on the partners GraphQL type.
export const getPartnerWhatsappStatusQuery = `
query GetPartnerWhatsappStatus($partner_id: uuid!) {
  whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}, order_by: {is_primary: desc}) {
    display_phone
    is_primary
  }
}
`;

/*...........types...........*/

export interface BranchOutlet {
  id: string;
  username: string;
  store_name: string;
  store_tagline?: string | null;
  store_banner?: string | null;
  location?: string | null;
  location_details?: string | null;
  phone?: string | null;
  geo_location?: { coordinates: [number, number] } | null;
  status?: string | null;
  subscription_details?: any;
  delivery_rules?: {
    delivery_radius?: number;
    [key: string]: any;
  } | null;
}

export interface BranchContext {
  id: string;
  name: string;
  tagline?: string | null;
  parent_partner_id: string;
  outlets: BranchOutlet[];
}

export interface PartnerBranchInfo {
  id: string;
  branch_id: string | null;
  branch: {
    id: string;
    name: string;
    tagline?: string | null;
    whatsapp_source?: "direct" | "main" | null;
    parent_partner_id: string;
    parent_partner?: {
      id: string;
      store_name: string;
      username: string;
    } | null;
    outlets: Array<{
      id: string;
      username: string;
      store_name: string;
      store_tagline?: string | null;
      location?: string | null;
      location_details?: string | null;
      phone?: string | null;
      status?: string | null;
      hide_from_outlets?: boolean | null;
    }>;
  } | null;
}
