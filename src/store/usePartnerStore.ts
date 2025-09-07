import { create } from "zustand";

export interface Partner {
  id: string;
  name: string;
  email: string;
  store_name: string;
  location: string;
  status: string;
  upi_id: string;
  geo_location: string;
  delivery_rate: string; // Keep as number
  description: string;
  phone?: string;
  district?: string;
}

interface PartnerStore {
  partners: Partner[];
  setPartners: (partners: Partner[]) => void;
  removePartner: (id: string) => void;
}

export const usePartnerStore = create<PartnerStore>((set) => ({
  partners: [],
  setPartners: (partners) => set({ partners }),
  removePartner: (id) =>
    set((state) => ({
      partners: state.partners.filter((p) => p.id !== id),
    })),
}));
