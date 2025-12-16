"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";



const DELETE_PARTNER_PAYMENTS = `
  mutation DeletePartnerPayments($partner_id: uuid!) {
    delete_partner_payments(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;
const GET_PARTNER_QR_IDS = `
  query GetPartnerQrIds($partner_id: uuid!) {
    qr_codes(where: {partner_id: {_eq: $partner_id}}) {
      id
    }
  }
`;

const DELETE_QR_SCANS_BY_IDS = `
  mutation DeleteQrScansByIds($qr_ids: [uuid!]!) {
    delete_qr_scans(where: {qr_id: {_in: $qr_ids}}) {
      affected_rows
    }
  }
`;

const DELETE_QR_CODES = `
  mutation DeleteQrCodes($partner_id: uuid!) {
    delete_qr_codes(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_QR_GROUPS = `
  mutation DeleteQrGroups($partner_id: uuid!) {
    delete_qr_groups(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_ORDER_ITEMS = `
  mutation DeleteOrderItems($partner_id: uuid!) {
    delete_order_items(where: {order: {partner_id: {_eq: $partner_id}}}) {
      affected_rows
    }
  }
`;

const DELETE_ORDERS = `
  mutation DeleteOrders($partner_id: uuid!) {
    delete_orders(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

// Offer Items typically don't exist as a standalone table if they are just JSON or part of menu.
// Removing DELETE_OFFER_ITEMS based on previous error.



const DELETE_OFFERS = `
  mutation DeleteOffers($partner_id: uuid!) {
    delete_offers(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_STOCKS = `
  mutation DeleteStocks($partner_id: uuid!) {
    delete_stocks(where: {menu: {partner_id: {_eq: $partner_id}}}) {
      affected_rows
    }
  }
`;

const DELETE_MENU = `
  mutation DeleteMenu($partner_id: uuid!) {
    delete_menu(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_CATEGORY = `
  mutation DeleteCategory($partner_id: uuid!) {
    delete_category(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_DEVICE_TOKENS = `
  mutation DeleteDeviceTokens($user_id: String!) {
    delete_device_tokens(where: {user_id: {_eq: $user_id}}) {
      affected_rows
    }
  }
`;

const DELETE_CAPTAIN = `
  mutation DeleteCaptain($partner_id: uuid!) {
    delete_captain(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_PAYMENTS = `
  mutation DeletePayments($partner_id: uuid!) {
    delete_payments(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_FOLLOWERS = `
  mutation DeleteFollowers($partner_id: uuid!) {
    delete_followers(where: {partner_id: {_eq: $partner_id}}) {
      affected_rows
    }
  }
`;

const DELETE_PARTNER = `
  mutation DeletePartner($partner_id: uuid!) {
    delete_partners_by_pk(id: $partner_id) {
      id
    }
  }
`;

const SEARCH_PARTNERS = `
  query SearchPartners($search: String!) {
    partners(where: {_or: [{store_name: {_ilike: $search}}, {name: {_ilike: $search}}, {email: {_ilike: $search}}]}, limit: 10) {
      id
      store_name
      name
      email
      location
    }
  }
`;

export async function searchPartners(query: string) {
  try {
    const res = await fetchFromHasura(SEARCH_PARTNERS, { search: `%${query}%` });
    return { success: true, partners: res.partners || [] };
  } catch (error: any) {
    console.error("Error searching partners:", error);
    return { success: false, error: error.message };
  }
}

// Removed GET_OFFER_GROUP_IDS and DELETE_OFFER_GROUPS_BY_IDS as schema link is unclear and causing errors.

export async function deletePartnerFullData(partnerId: string) {
  const results: Record<string, any> = {};
  const errors: string[] = [];

  const runDelete = async (name: string, mutation: string, variables: any = { partner_id: partnerId }) => {
    try {
      const res = await fetchFromHasura(mutation, variables);
      results[name] = res;
    } catch (e: any) {
      console.error(`Error deleting ${name}:`, e);
      errors.push(`${name}: ${e.message}`);
      results[name] = { error: e.message };
    }
  };

  try {
    // 0. Pre-fetch QR IDs
    const qrData = await fetchFromHasura(GET_PARTNER_QR_IDS, { partner_id: partnerId });
    const qrIds = qrData?.qr_codes?.map((q: any) => q.id) || [];

    if (qrIds.length > 0) {
      await runDelete("qr_scans", DELETE_QR_SCANS_BY_IDS, { qr_ids: qrIds });
    } else {
      results["qr_scans"] = { affected_rows: 0, note: "No QR codes found" };
    }

    // 1. Child/Leaf dependencies
    await runDelete("order_items", DELETE_ORDER_ITEMS);
    // await runDelete("offer_items", DELETE_OFFER_ITEMS); // Removed

    // 2. Dependencies
    await runDelete("orders", DELETE_ORDERS);
    await runDelete("offers", DELETE_OFFERS);

    // Skipped offer_groups deletion due to schema ambiguity

    await runDelete("qr_codes", DELETE_QR_CODES);

    // 3. More dependencies
    await runDelete("qr_groups", DELETE_QR_GROUPS);

    // Stocks depend on menu, so delete stocks first
    await runDelete("stocks", DELETE_STOCKS);
    await runDelete("menu", DELETE_MENU);

    await runDelete("category", DELETE_CATEGORY);

    // Device tokens uses userId string
    await runDelete("device_tokens", DELETE_DEVICE_TOKENS, { user_id: partnerId });

    await runDelete("captain", DELETE_CAPTAIN);
    await runDelete("payments", DELETE_PAYMENTS);
    await runDelete("partner_payments", DELETE_PARTNER_PAYMENTS);
    await runDelete("followers", DELETE_FOLLOWERS);

    // 4. Partner
    await runDelete("partner", DELETE_PARTNER);

  } catch (error: any) {
    console.error("Critical error in deletePartnerFullData execution flow:", error);
    return { success: false, results, errors: [error.message] };
  }

  return { success: errors.length === 0, results, errors };
}
