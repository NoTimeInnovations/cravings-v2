import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Partner } from "./authStore";
import { deleteFileFromS3, deletePartnerFilesFromS3 } from "@/app/actions/aws-s3";
import { fetchFromHasura } from "@/lib/hasuraClient";

interface CreatedPartnerState {
  partner: Partner | null;
  partnerBanner: string | null;
  setPartnerBanner: (banner: string | null) => void;
  setPartner: (partner: Partner) => void;
  clearPartner: () => void;
  deletePartner: (partnerId: string) => void;
}

export const useCreatedPartnerStore = create<CreatedPartnerState>()(
  persist(
    (set) => ({
      partner: null,
      partnerBanner: null,
      setPartnerBanner: (banner: string | null) => set({ partnerBanner: banner }),
      setPartner: (partner) => set({ partner }),
      clearPartner: () => set({ partner: null  , partnerBanner: null }),
      deletePartner: async (partnerId: string) => {
        try {
          //first delete the all files frrom s3 of this partner

          await deletePartnerFilesFromS3(partnerId);

          //then delete frorm database

          await fetchFromHasura(
            `
            mutation DeletePartner($partnerId: uuid!) {
              delete_partners_by_pk(id: $partnerId) {
                id
              }
            }
          `,
            {
              partnerId,
            }
          );
        } catch (error) {
          console.error("Error deleting partner:", error);
          throw error;
        }
      },
    }),
    {
      name: "created-partner-store", // localStorage? key
    }
  )
);
