"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "next/cache";

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

const GET_MENU_ITEMS = `
  query GetMenuItems($partner_id: uuid!) {
    menu(where: {partner_id: {_eq: $partner_id}}, order_by: {name: asc}) {
      id
      name
      image_url
      category {
        name
      }
      price
      variants
      description
    }
  }
`;

export async function getMenuItems(partnerId: string) {
  try {
    const res = await fetchFromHasura(GET_MENU_ITEMS, { partner_id: partnerId });
    return { success: true, menu: res.menu || [] };
  } catch (error: any) {
    console.error("Error fetching menu items:", error);
    return { success: false, error: error.message };
  }
}

const UPDATE_ITEM_IMAGE = `
  mutation UpdateMenuItemImage($id: uuid!, $image_url: String!) {
    update_menu_by_pk(pk_columns: {id: $id}, _set: {image_url: $image_url}) {
      id
      image_url
    }
  }
`;

export async function updateMenuItemImage(itemId: string, imageUrl: string) {
  try {
    const res = await fetchFromHasura(UPDATE_ITEM_IMAGE, { id: itemId, image_url: imageUrl });
    return { success: true, item: res.update_menu_by_pk };
  } catch (error: any) {
    console.error("Error updating item image:", error);
    return { success: false, error: error.message };
  }
}

const UPDATE_ITEM_NAME = `
  mutation UpdateMenuItemName($id: uuid!, $name: String!) {
    update_menu_by_pk(pk_columns: {id: $id}, _set: {name: $name}) {
      id
      name
    }
  }
`;

export async function updateMenuItemName(itemId: string, name: string) {
  try {
    const res = await fetchFromHasura(UPDATE_ITEM_NAME, { id: itemId, name });
    return { success: true, item: res.update_menu_by_pk };
  } catch (error: any) {
    console.error("Error updating item name:", error);
    return { success: false, error: error.message };
  }
}

const REMOVE_VARIANTS = `
  mutation RemoveVariants($id: uuid!) {
    update_menu_by_pk(pk_columns: {id: $id}, _set: {variants: null}) {
      id
      variants
    }
  }
`;

export async function removeVariants(itemId: string) {
  try {
    const res = await fetchFromHasura(REMOVE_VARIANTS, { id: itemId });
    return { success: true, item: res.update_menu_by_pk };
  } catch (error: any) {
    console.error("Error removing variants:", error);
    return { success: false, error: error.message };
  }
}

const UPDATE_ITEM_DESCRIPTION = `
  mutation UpdateMenuItemDescription($id: uuid!, $description: String!) {
    update_menu_by_pk(pk_columns: {id: $id}, _set: {description: $description}) {
      id
      description
    }
  }
`;

export async function updateMenuItemDescription(itemId: string, description: string) {
  try {
    const res = await fetchFromHasura(UPDATE_ITEM_DESCRIPTION, { id: itemId, description });
    return { success: true, item: res.update_menu_by_pk };
  } catch (error: any) {
    console.error("Error updating item description:", error);
    return { success: false, error: error.message };
  }
}

export async function revalidatePartnerTag(partnerId: string) {
  revalidateTag(partnerId, {});
  return { success: true };
}
