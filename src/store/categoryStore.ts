import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { create } from "zustand";

interface CategoryState {
  categories: string[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<string[]>;
  addCategory: (cat: string) => Promise<string | void>;
  deleteCategory: (cat: string) => Promise<void>;
  getCategoryById: (catId: string) => Promise<string | null>;
  updateCategory: (cat: string, catId: string) => Promise<string | void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  prevCategories: [],
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    try {
      set({ loading: true, error: null });

      if (get().categories.length > 0) {
        set({ loading: false });
        return get().categories as string[];
      }

      const categories = (await getDocs(collection(db, "categories"))).docs.map(
        (doc) => doc.data().name
      );

      set({ categories, loading: false });
      return categories as string[];
    } catch (/* eslint-disable @typescript-eslint/no-unused-vars */ _error /* eslint-enable @typescript-eslint/no-unused-vars */) {
      set({ loading: false, error: "Failed to fetch categories" });
      return [];
    }
  },

  addCategory: async (cat) => {
    try {
      set({ loading: true, error: null });
  
      const allCategories = (
        await getDocs(collection(db, "categories"))
      ).docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        addedBy: doc.data().addedBy,
      }));

      const isCategoryExists = allCategories.find(
        (category) =>
          category.name.toLowerCase() === cat.toLowerCase() &&
          category.addedBy === auth.currentUser?.uid
      );
  
      if (isCategoryExists) {
        set({ loading: false, error: "Category already exists" });
        return isCategoryExists.id; 
      }

      const addedCat = await addDoc(collection(db, "categories"), {
        name: cat.toLowerCase(),
        addedBy: auth.currentUser?.uid,
      });
  
      set((state) => ({
        categories: [...state.categories, cat.toLowerCase()],
        loading: false,
      }));
  
      return addedCat.id;
    } catch (/* eslint-disable @typescript-eslint/no-unused-vars */ error /* eslint-enable @typescript-eslint/no-unused-vars */) {
      console.error(error);
      set({ loading: false, error: "Failed to add category" });
    }
  }
  ,

  updateCategory: async (cat, catId) => {
    try {
      set({ loading: true, error: null });

      await updateDoc(doc(db, "categories", catId), {
        name: cat.toLowerCase(),
      });

      const updated = cat.toLowerCase();
      return updated;
    } catch (/* eslint-disable @typescript-eslint/no-unused-vars */ error /* eslint-enable @typescript-eslint/no-unused-vars */) {
      set({ loading: false, error: "Failed to add category" });
    }
  },

  deleteCategory: async (cat) => {
    try {
      set({ loading: true, error: null });
      const catId = (await getDocs(collection(db, "categories"))).docs.find(
        (doc) => doc.data().cat === cat
      )?.id;

      if (!catId) {
        set({ loading: false, error: "Category not found" });
        return;
      }
      await deleteDoc(doc(db, "categories", catId));
      set((state) => ({
        categories: state.categories.filter((category) => category !== cat),
        loading: false,
      }));
    } catch (/* eslint-disable @typescript-eslint/no-unused-vars */ error /* eslint-enable @typescript-eslint/no-unused-vars */) {
      set({ loading: false, error: "Failed to delete category" });
    }
  },

  getCategoryById: async (catId) => {
    try {
      const catDocRef = doc(db, "categories", catId);
      const catDoc = await getDoc(catDocRef);
      if (!catDoc.exists()) {
        console.error("Category not found");
        return null;
      }
      return catDoc.data().name;
    } catch (error) {
      console.error("Error fetching category by ID:", error);
      return null;
    }
  },
}));
