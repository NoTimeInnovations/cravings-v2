import { create } from "zustand";
import type { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";

export interface CustomizerPayload {
  item: HotelDataMenus;
  hotelData?: HotelData;
  currency: string;
  /** Theme accent colour for the sheet's primary controls. */
  accent?: string;
  /** Pre-computed base line price (e.g. offer / delivery-adjusted price the card
   *  already resolved). Falls back to item.price when omitted. Ignored when the
   *  item has variants (the chosen variant drives the base price instead). */
  basePrice?: number;
  /** Where the configured line should go. When provided (e.g. the POS), the sheet
   *  calls this instead of the customer cart (orderStore.addItem). Receives the
   *  fully-built cart line and the chosen quantity. */
  onAdd?: (line: any, qty: number) => void;
}

interface CustomizerState {
  isOpen: boolean;
  payload: CustomizerPayload | null;
  open: (payload: CustomizerPayload) => void;
  close: () => void;
}

/**
 * Drives the single, globally-mounted <ItemCustomizationSheet/>. Kept separate
 * from orderStore so any menu-style ItemCard can open the sheet without each one
 * mounting its own copy. The sheet reads this store and calls orderStore.addItem
 * on confirm.
 */
export const useCustomizerStore = create<CustomizerState>((set) => ({
  isOpen: false,
  payload: null,
  open: (payload) => set({ isOpen: true, payload }),
  close: () => set({ isOpen: false }),
}));
