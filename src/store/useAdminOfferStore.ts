import { create } from "zustand";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AdminOffer {
  id: string;
  menuItemId: string;
  hotelId: string;
  newPrice: number;
  itemsAvailable: number;
  fromTime: Date;
  toTime: Date;
  createdAt: Date;
}

interface AdminOfferState {
  adminOffers: AdminOffer[];
  loading: boolean;
  error: string | null;
  fetchAdminOffers: (hotelId: string) => Promise<void>;
}

export const useAdminOfferStore = create<AdminOfferState>((set) => ({
  adminOffers: [],
  loading: false,
  error: null,

  fetchAdminOffers: async (hotelId) => {
    try {
      set({ loading: true, error: null });
  
      const now = new Date().toString();
      const offersCollection = collection(db, "offers");
      const offersQuery = query(
        offersCollection,
        where("hotelId", "==", hotelId), // Filter by hotelId
        where("toTime", "<", now) // Optional: Filter by active offers
      );
      const querySnapshot = await getDocs(offersQuery);
  
      // Map and cast the data to AdminOffer
      const adminOffers = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          menuItemId: data.menuItemId,
          hotelId: data.hotelId,
          newPrice: data.newPrice,
          itemsAvailable: data.itemsAvailable,
          fromTime: data.fromTime?.toDate ? data.fromTime.toDate() : data.fromTime, // Convert Firestore Timestamp to Date
          toTime: data.toTime?.toDate ? data.toTime.toDate() : data.toTime, // Convert Firestore Timestamp to Date
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt, // Convert Firestore Timestamp to Date
        } as AdminOffer;
      });
  
      set({ adminOffers, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));