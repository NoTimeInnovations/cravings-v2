import {
  addCategory,
  getCategory,
  getPartnerCategories,
  getPartnerCategoryTree,
  update_category_parent,
} from "@/api/category";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { create } from "zustand";
import { useAuthStore } from "@/store/authStore";
import { update_category } from "@/api/menu";
import { useMenuStore } from "./menuStore_hasura";
import { revalidateTag } from "@/app/actions/revalidate";

export interface Category {
  id: string;
  name: string;
  partner_id?: string;
  priority?: number;
  is_active?: boolean;
  visibility_config?: any;
  /**
   * Parent category id, or null/undefined for a top-level category.
   *
   * The tree is deliberately capped at TWO levels — a category that has a
   * parent may not itself become one (see `canBeParent` in src/lib/categoryTree.ts).
   * Deeper nesting would have to be rendered by seven separate storefront
   * layouts, each with its own category rail, for no case anyone has asked for.
   */
  parent_id?: string | null;
  /** Populated only by queries that select the `parent` relationship. */
  parent?: { id: string; name: string; priority?: number; is_active?: boolean } | null;
}

// Helper function to format category name for display
export const formatDisplayName = (name: string): string => {
  return name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Helper function to format category name for storage
export const formatStorageName = (name: string): string => {
  return name.toLowerCase().trim().replace(/ /g, "_");
};

interface CategoryState {
  categories: Category[];
  fetchCategories: (addedBy: string) => Promise<Category[] | void>;
  /**
   * Every category the partner owns, including empty ones.
   *
   * Separate from `fetchCategories` because that one filters to categories
   * that contain at least one menu item — a parent category holds none of its
   * own, so it would be missing from the very picker meant to offer it as a
   * parent. Returns fresh rows and does NOT touch `categories`, so no existing
   * screen changes behaviour.
   */
  fetchCategoryTree: (partnerId: string) => Promise<Category[]>;
  addCategory: (cat: string , userId?: string | null, parentId?: string | null) => Promise<Category | void>;
  updateCategory: (cat: Category) => Promise<void>;
  /**
   * Re-parent a category, or pass null to promote it back to top level.
   *
   * Deliberately its own mutation rather than a field on `updateCategory`:
   * that one writes `_set` from named variables, so a caller that didn't know
   * about parents — the rename box, the on/off toggle, the availability
   * manager — would send `parent_id: null` and silently flatten the tree.
   */
  setCategoryParent: (categoryId: string, parentId: string | null) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],

  fetchCategories: async (addedBy: string) => {
    try {
      if (get().categories.length > 0) {
        return get().categories as Category[];
      }

      const allCategories = await fetchFromHasura(getPartnerCategories, {
        partner_id: addedBy,
      }).then((res) => 
        res.category.map((cat: Category) => ({
          ...cat,
          name: cat.name,
          is_active: cat.is_active !== false, // Ensure boolean value
        }))
      );

      set({ categories: allCategories.map((cat : Category) => ({
        ...cat,
        name: formatDisplayName(cat.name),
        is_active: cat.is_active !== false, // Ensure boolean value is preserved
      })) });
      return allCategories as Category[];
    } catch (error: unknown) {
      console.error(
        "Fetch categories error:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  },

  addCategory: async (cat , userId, parentId) => {
    try {
      if (!cat) throw new Error("Category name is required");

      const userData = useAuthStore.getState().userData;

      const formattedName = formatStorageName(cat);

      const existingCategories = await fetchFromHasura(getCategory, {
        name: cat,
        name_with_space: formattedName.replace(/_/g, " "),
        name_with_underscore: formattedName.replace(/ /g, "_"),
        partner_id: userId || userData?.id,
      }).then((res) => res.category);

      const existingCategory = existingCategories[0];

      if (existingCategory) {
        const isAlredyInCategories = get().categories.some(
          (category) => category.id === existingCategory.id
        );

        if (!isAlredyInCategories) {
          set({
            categories: [
              ...get().categories,
              { name: formatDisplayName(existingCategory.name), id: existingCategory.id },
            ],
          });
        }

        return existingCategory as Category;
      } else {
        const addedCat = await fetchFromHasura(addCategory, {
          category: {
            name: formattedName,
            partner_id: userId || userData?.id,
            // Omitted (not null) when there's no parent, so the column keeps its
            // default for every existing caller that knows nothing about trees.
            ...(parentId ? { parent_id: parentId } : {}),
          },
        }).then((res) => res.insert_category.returning[0]);

        set({
          categories: [
            ...get().categories,
            {
              name: formatDisplayName(formattedName),
              id: addedCat.id,
              parent_id: addedCat.parent_id ?? null,
            },
          ],
        });

        return addedCat as Category;
      }
    } catch (error: unknown) {
      console.error(error);
    }
  },

  fetchCategoryTree: async (partnerId: string) => {
    try {
      const res = await fetchFromHasura(getPartnerCategoryTree, { partner_id: partnerId });
      return (res.category || []).map((c: Category) => ({
        ...c,
        name: formatDisplayName(c.name),
        is_active: c.is_active !== false,
        parent_id: c.parent_id ?? null,
      })) as Category[];
    } catch (error) {
      console.error("Fetch category tree error:", error);
      return [];
    }
  },

  setCategoryParent: async (categoryId: string, parentId: string | null) => {
    const user = useAuthStore.getState().userData;
    await fetchFromHasura(update_category_parent, { id: categoryId, parent_id: parentId });
    set({
      categories: get().categories.map((c) =>
        c.id === categoryId ? { ...c, parent_id: parentId } : c,
      ),
    });
    revalidateTag(user?.id as string);
  },

  updateCategory: async (cat: Category) => {
    try {
      const updatedCategories = useMenuStore.getState().updatedCategories;
      const user = useAuthStore.getState().userData;

      const updatedCat = {
        id: cat.id,
        name: formatStorageName(cat.name),
        priority: cat.priority ?? 0, // Ensure priority is never null
        is_active: cat.is_active !== false, // Ensure boolean value
        visibility_config: cat.visibility_config ?? { type: "default", hidden: false },
      };

      const updatedCategory = await fetchFromHasura(update_category, {
        ...updatedCat,
      }).then((res) => res.update_category_by_pk);

      // Format the updated category
      const formattedUpdatedCategory = {
        ...updatedCategory,
        name: formatDisplayName(updatedCategory.name),
        is_active: updatedCategory.is_active !== false // Ensure boolean value
      };

      // Get the updated categories list
      const newCategories = get().categories.map((category) =>
        category.id === updatedCategory.id
          ? formattedUpdatedCategory
          : category
      );

      // Update the store with the updated categories
      set({
        categories: newCategories,
      });

      // Update categories of menu items
      revalidateTag(user?.id as string);
      updatedCategories(newCategories);
      
      // Return the formatted updated category
      return formattedUpdatedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error; // Re-throw to handle in the component
    }
  },
}))
