import { create } from "zustand";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Define the demo partner type
export interface DemoPartner {
  id: string;
  name: string;
  banner: string;
  description: string;
  type: string;
  food_type?: string;
  demopartner_id: string; // foreign key to partners.id
}

interface DemoPartnerState {
  demoPartners: DemoPartner[];
  fetchDemoPartners: () => Promise<DemoPartner[]>;
  addDemoPartner: (partner: DemoPartner) => Promise<DemoPartner | null>;
  updateDemoPartner: (id: string, updates: Partial<DemoPartner>) => Promise<DemoPartner | null>;
  deleteDemoPartner: (id: string) => Promise<boolean>;
}

export const useDemoPartnerStore = create<DemoPartnerState>((set, get) => ({
  demoPartners: [],

  fetchDemoPartners: async () => {
    const query = `
      query DemoPartners {
        demo_partners(order_by: {name: asc}) {
          id
          name
          banner
          description
          type
          food_type
          demopartner_id
        }
      }
    `;
    const response = await fetchFromHasura(query, {});
    const demoPartners = response.demo_partners as DemoPartner[];
    set({ demoPartners });
    return demoPartners;
  },

  addDemoPartner: async (partner) => {
    const mutation = `
      mutation InsertDemoPartner($object: demo_partners_insert_input!) {
        insert_demo_partners_one(object: $object) {
          id
          name
          banner
          description
          type
          food_type
          demopartner_id
        }
      }
    `;
    const response = await fetchFromHasura(mutation, { object: partner });
    const newPartner = response.insert_demo_partners_one as DemoPartner | null;
    if (newPartner) {
      set({ demoPartners: [...get().demoPartners, newPartner] });
    }
    return newPartner;
  },

  updateDemoPartner: async (id, updates) => {
    const mutation = `
      mutation UpdateDemoPartner($id: uuid!, $updates: demo_partners_set_input!) {
        update_demo_partners_by_pk(pk_columns: {id: $id}, _set: $updates) {
          id
          name
          banner
          description
          type
          food_type
          demopartner_id
        }
      }
    `;
    const response = await fetchFromHasura(mutation, { id, updates });
    const updatedPartner = response.update_demo_partners_by_pk as DemoPartner | null;
    if (updatedPartner) {
      set((state) => ({
        demoPartners: state.demoPartners.map((p) => (p.id === id ? updatedPartner : p)),
      }));
    }
    return updatedPartner;
  },

  deleteDemoPartner: async (id) => {
    const mutation = `
      mutation DeleteDemoPartner($id: uuid!) {
        delete_demo_partners_by_pk(id: $id) {
          id
        }
      }
    `;
    try {
      await fetchFromHasura(mutation, { id });
      set((state) => ({
        demoPartners: state.demoPartners.filter((p) => p.id !== id),
      }));
      return true;
    } catch (error) {
      console.error("Failed to delete demo partner", error);
      return false;
    }
  },
})); 