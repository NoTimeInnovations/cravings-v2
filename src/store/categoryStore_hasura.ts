import { addCategory, getCategory, getPartnerCategories } from "@/api/category";
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
  addCategory: (cat: string , userId?: string | null) => Promise<Category | void>;
  updateCategory: (cat: Category) => Promise<void>;
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

  addCategory: async (cat , userId) => {
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
          },
        }).then((res) => res.insert_category.returning[0]);

        set({
          categories: [
            ...get().categories,
            { name: formatDisplayName(formattedName), id: addedCat.id },
          ],
        });

        return addedCat as Category;
      }
    } catch (error: unknown) {
      console.error(error);
    }
  },

  updateCategory: async (cat: Category) => {
    try {
      const updatedCategories = useMenuStore.getState().updatedCategories;
      const user = useAuthStore.getState().userData;

      const updatedCat = {
        id: cat.id,
        name: formatStorageName(cat.name),
        priority: cat.priority,
        is_active: cat.is_active !== false, // Ensure boolean value
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
