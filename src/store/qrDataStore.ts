//create aa zuatnd stor
import { create } from "zustand";

export type QrCode = {
  id: string;
  qr_number: string;
  table_number: number;
  table_name?: string | null;
  partner_id?: string;
  partner?: {
    store_name: string;
  };
};

interface QrDataState {
  qrData: QrCode | null;
  setQrData: (qrCodes: QrCode | null) => void;
  clearQrData: () => void;
}

export const useQrDataStore = create<QrDataState>((set) => ({
  qrData: null,
  setQrData: (qrCode: QrCode | null) =>
    set(() => ({
      qrData: qrCode,
    })),
  clearQrData: () => set({ qrData: null  }),
}));
