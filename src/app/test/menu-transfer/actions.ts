"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

const GET_SOURCE_MENU = `
  query GetSourceMenu($partner_id: uuid!) {
    category(where: {partner_id: {_eq: $partner_id}, is_active: {_eq: true}}) {
      id
      name
      priority
      is_active
    }
    menu(where: {partner_id: {_eq: $partner_id}, deletion_status: {_eq: 0}}) {
      id
      name
      description
      price
      image_url
      is_available
      category_id
      variants
    }
  }
`;

const INSERT_CATEGORY = `
  mutation InsertCategory($object: category_insert_input!) {
    insert_category_one(object: $object) {
      id
    }
  }
`;

const INSERT_MENU_ITEM = `
  mutation InsertMenuItem($object: menu_insert_input!) {
    insert_menu_one(object: $object) {
      id
    }
  }
`;

export async function copyMenu(sourcePartnerId: string, targetPartnerId: string) {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Fetch Source Data
    const sourceData = await fetchFromHasura(GET_SOURCE_MENU, { partner_id: sourcePartnerId });
    const sourceCategories = sourceData.category || [];
    const sourceMenuItems = sourceData.menu || [];

    if (sourceCategories.length === 0) {
      return { success: false, results: [], errors: ["No categories found for source partner."] };
    }

    results.push(`Found ${sourceCategories.length} categories and ${sourceMenuItems.length} items.`);

    // 2. Copy Categories & Build Map
    const categoryMap = new Map<string, string>(); // OldID -> NewID

    for (const cat of sourceCategories) {
      try {
        const newCat = await fetchFromHasura(INSERT_CATEGORY, {
          object: {
            name: cat.name,
            partner_id: targetPartnerId,
            priority: cat.priority,
            is_active: cat.is_active,
          }
        });

        if (newCat?.insert_category_one?.id) {
          categoryMap.set(cat.id, newCat.insert_category_one.id);
          // results.push(`Created category: ${cat.name}`);
        } else {
          errors.push(`Failed to create category: ${cat.name}`);
        }
      } catch (err: any) {
        errors.push(`Error creating category ${cat.name}: ${err.message}`);
      }
    }

    results.push(`Successfully created ${categoryMap.size} categories.`);

    // 3. Copy Menu Items
    let itemsCreated = 0;
    for (const item of sourceMenuItems) {
      try {
        const newCategoryId = categoryMap.get(item.category_id);

        if (!newCategoryId) {
          // Provide fallback or skip? Skipping for now as orphan items are bad.
          errors.push(`Skipped item ${item.name}: Category link lost.`);
          continue;
        }

        await fetchFromHasura(INSERT_MENU_ITEM, {
          object: {
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            is_available: item.is_available,
            category_id: newCategoryId,
            partner_id: targetPartnerId,
            variants: item.variants,
            deletion_status: 0
          }
        });
        itemsCreated++;
      } catch (err: any) {
        errors.push(`Error creating item ${item.name}: ${err.message}`);
      }
    }

    results.push(`Successfully created ${itemsCreated} menu items.`);

  } catch (error: any) {
    console.error("Critical error in copyMenu:", error);
    return { success: false, results, errors: [error.message, ...errors] };
  }

  return { success: errors.length === 0, results, errors };
}
