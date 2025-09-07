import { create } from "zustand";
import { useAuthStore } from "./authStore";
// import { unstable_cache } from "next/cache";
import { fetchFromHasura } from "@/lib/hasuraClient";
// import  from "@/lib/getTimeStampWithTimezon";
import {
  addOffer,
  deleteOffer,
  getOffers,
  getPartnerOffers,
  incrementOfferEnquiry,
} from "@/api/offers";
import { revalidateTag } from "@/app/actions/revalidate";
import { toast } from "sonner";
import { sendOfferWhatsAppMsg } from "@/app/actions/sendWhatsappMsgs";
import { Notification } from "@/app/actions/notification";
import { HotelData } from "@/app/hotels/[...id]/page";
import { useMenuStore } from "./menuStore_hasura";

interface Category {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
}

interface Partner {
  district: string;
  location: string;
  id: string;
  store_name: string;
  feature_flags: string;
}

interface MenuItem {
  category: Category;
  description: string;
  image_url: string;
  id: string;
  name: string;
  price: number;
  variants?: {
    name: string;
    price: number;
  }[];
}

export interface OfferGroup {
  name: string;
  description?: string;
  percentage: number;
  menu_item_ids: string[];
  menu_items?: MenuItem[];
}

export interface Offer {
  id: string;
  created_at: string;
  enquiries: number;
  start_time: string;
  end_time: string;
  items_available?: number;
  offer_price?: number;
  offer_type?: string;
  image_urls?: string[];
  deletion_status?: number;
  offer_group?: OfferGroup;
  menu: MenuItem;
  partner?: Partner;
  variant?: {
    name: string;
    price: number;
  };
}

interface OfferState {
  offers: Offer[];
  fetchPartnerOffers: (partnerId?: string) => Promise<void>;
  addOffer: (
    offer: {
      menu_id?: string;
      offer_price?: number;
      items_available?: number;
      start_time: string;
      end_time: string;
      offer_type?: string;
      image_urls?: string[];
      offer_group?: OfferGroup;
      variant?: {
        name: string;
        price: number;
      };
    },
    notificationMessage: {
      title: string;
      body: string;
    }
  ) => Promise<void>;
  fetchOffer: () => Promise<Offer[]>;
  deleteOffer: (id: string) => Promise<void>;
  incrementOfferEnquiry: (offerId: string) => Promise<void>;
}

export const useOfferStore = create<OfferState>((set, get) => {
  return {
    offers: [],

    fetchOffer: async () => {
      if (get().offers.length > 0) {
        return get().offers;
      }

      try {
        // const offers = await unstable_cache(
        //   async () => {
        const offers = await fetchFromHasura(getOffers);

        // Parse variant JSON for each offer
        const parsedOffers = offers.offers.map((offer: any) => {
          let parsedVariant = undefined;
          if (offer.variant) {
            // Handle both string (JSON) and object formats for backward compatibility
            if (typeof offer.variant === 'string') {
              try {
                const parsed = JSON.parse(offer.variant);
                parsedVariant = Array.isArray(parsed) ? parsed[0] : parsed;
              } catch (error) {
                console.error("Error parsing variant JSON:", error);
              }
            } else {
              // Direct object format
              parsedVariant = offer.variant;
            }
          }
          return {
            ...offer,
            variant: parsedVariant,
          };
        });

        // return off;
        //   },
        //   ["all-offers", "offers"],
        //   {
        //     tags: ["all-offers", "offers"],
        //   }
        // )();
        set({ offers: parsedOffers });
        return parsedOffers;
      } catch (error) {
        console.error(error);
        return get().offers;
      }
    },

    setOffers: (offers: Offer[]) => {
      set({ offers });
    },

    fetchPartnerOffers: async (partnerId?: string) => {
      if (get().offers.length > 0) {
        return;
      }

      try {
        const userData = useAuthStore.getState().userData;
        const targetId = partnerId ? partnerId : userData?.id;

        if (!targetId) {
          throw "No partner ID provided";
        }

        // const offers = await unstable_cache(async () => {
        const offers = await fetchFromHasura(getPartnerOffers, {
          partner_id: targetId,
        });

        // Parse variant JSON for each offer
        const parsedOffers = offers.offers.map((offer: any) => {
          let parsedVariant = undefined;
          if (offer.variant) {
            // Handle both string (JSON) and object formats for backward compatibility
            if (typeof offer.variant === 'string') {
              try {
                const parsed = JSON.parse(offer.variant);
                parsedVariant = Array.isArray(parsed) ? parsed[0] : parsed;
              } catch (error) {
                console.error("Error parsing variant JSON:", error);
              }
            } else {
              // Direct object format
              parsedVariant = offer.variant;
            }
          }
          return {
            ...offer,
            variant: parsedVariant,
          };
        });

        //   return offs;
        // }, ["partner-offers-" + targetId, "offers"], {
        //   tags: ["partner-offers-" + targetId, "offers"]
        // })();

        set({ offers: parsedOffers });
      } catch (error) {
        console.error("Error fetching offers:", error);
      }
    },

    addOffer: async (
      offer: {
        menu_id?: string;
        offer_price?: number;
        items_available?: number;
        start_time: string;
        end_time: string;
        offer_type?: string;
        offer_group?: OfferGroup;
        image_urls?: string[];
        variant?: {
          name: string;
          price: number;
        };
      },
      notificationMessage: {
        title: string;
        body: string;
      }
    ) => {
      try {
        toast.loading("Adding offer...");
        const user = useAuthStore.getState().userData;
        if (!user) throw "Partner not found";

        let common = {
          created_at: new Date().toISOString(),
          end_time: new Date(offer.end_time).toISOString(),
          start_time: new Date(offer.start_time).toISOString(),
          partner_id: user.id,
        };

        let newOffer: any = {};

        if (!offer.offer_group) {
          newOffer = {
            ...common,
            items_available: offer.items_available,
            menu_item_id: offer.menu_id,
            offer_price: offer.offer_price ? Math.round(offer.offer_price) : undefined,
            offer_type: offer.offer_type || 'all',
            variant: offer.variant || null,
            image_urls: offer.image_urls || [],
          };
        } else {

          const { items } = useMenuStore.getState();

          const menuItems = items
            .filter((item) => offer.offer_group?.menu_item_ids.includes(item.id as string))
            .map(({ id, name, price, image_url }) => ({ id, name, price, image_url }));

          newOffer = {
            ...common,
            offer_group: {
              name: offer.offer_group.name,
              description: offer.offer_group.description,
              percentage: offer.offer_group.percentage,
              menu_items: menuItems,
            },
          };
        }

        let addedOffer = await fetchFromHasura(addOffer, {
          offer: newOffer,
        });

        addedOffer = addedOffer.insert_offers.returning[0];

        // Parse variant JSON for the added offer
        const parsedAddedOffer = {
          ...addedOffer,
          variant: (() => {
            if (addedOffer.variant) {
              // Handle both string (JSON) and object formats for backward compatibility
              if (typeof addedOffer.variant === 'string') {
                try {
                  const parsed = JSON.parse(addedOffer.variant);
                  return Array.isArray(parsed) ? parsed[0] : parsed;
                } catch (error) {
                  console.error("Error parsing variant JSON:", error);
                  return undefined;
                }
              } else {
                // Direct object format
                return addedOffer.variant;
              }
            }
            return undefined;
          })(),
        };

        revalidateTag("offers");
        revalidateTag(user.id);

        set({
          offers: [...get().offers, parsedAddedOffer],
        });
        toast.dismiss();
        toast.success("Offer added successfully");


        if ('menu_item_id' in newOffer && newOffer.menu_item_id) {
          await sendOfferWhatsAppMsg(parsedAddedOffer.id);
        }

        await Notification.partner.sendOfferNotification(
          parsedAddedOffer,
          {
            title: notificationMessage.title ,
            body: notificationMessage.body ,
          }
        );
      } catch (error) {
        console.error(error);
        toast.dismiss();
        toast.error("Error adding offer");
      }
    },

    deleteOffer: async (id: string) => {
      try {
        toast.loading("Deleting offer...");
        const user = useAuthStore.getState().userData;
        if (!user) throw "Partner not found";

        await fetchFromHasura(deleteOffer, {
          id: id,
        });

        set({
          offers: get().offers.filter((offer) => offer.id !== id),
        });

        revalidateTag("offers");
        revalidateTag(user.id);
        toast.dismiss();
        toast.success("Offer deleted successfully");
      } catch (error) {
        console.error(error);
        toast.dismiss();
        toast.error("Error deleting offer");
      }
    },

    incrementOfferEnquiry: async (offerId: string) => {
      try {
        await fetchFromHasura(incrementOfferEnquiry, {
          id: offerId,
        });
        revalidateTag("offers");
      } catch (error) {
        console.error(error);
      }
    },
  };
});
