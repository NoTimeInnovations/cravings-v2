import { create } from "zustand";
import { Partner } from "./authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getAllPartnersQuery } from "@/api/partners";

interface PartnerState {
  partners: Partner[];
  fetchPartners: (limit: number, offset: number) => Promise<void>;
  setPartners: (partners: Partner[]) => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  partners: [],

  fetchPartners: async (limit: number, offset: number) => {
    try {
      const { partners } = await fetchFromHasura(getAllPartnersQuery, {
        offset: offset,
        limit: limit,
      });

      set((state) => ({
        partners: [...state.partners, ...partners],
      }));
    } catch (e) {
      console.error("Error fetching partners: ", e);
    }
  },

  setPartners(partners: Partner[]) {
    set({ partners });
  },
}));
