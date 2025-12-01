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

        // Deduplicate single-item offers for same item/variant by keeping max discount
        if (!offer.offer_group && offer.menu_id) {
          const existingOffers = get().offers;
          const sameItemOffers: Offer[] = existingOffers.filter((o) => {
            const sameMenu = o.menu?.id === offer.menu_id;
            const bothHaveVariant = Boolean(o.variant) && Boolean(offer.variant);
            const neitherHasVariant = !o.variant && !offer.variant;
            const sameVariant = bothHaveVariant
              ? (o.variant as any)?.name === offer.variant?.name
              : neitherHasVariant;
            return sameMenu && sameVariant;
          });

          const computeExistingPct = (o: Offer): number => {
            let original = 0;
            if (o.variant && (o.variant as any)?.price) original = Number((o.variant as any).price) || 0;
            else if (o.menu?.price != null) original = Number(o.menu.price) || 0;
            const discounted = Number(o.offer_price) || 0;
            if (!original || original <= 0) return 0;
            return Math.round(((original - discounted) / original) * 100);
          };

          const computeNewPct = (): number => {
            let original = 0;
            if (offer.variant && offer.variant.price != null) original = Number(offer.variant.price) || 0;
            else {
              const { items } = useMenuStore.getState();
              const mi = items.find((it) => it.id === offer.menu_id);
              original = Number(mi?.price) || 0;
            }
            const discounted = Number(offer.offer_price) || 0;
            if (!original || original <= 0) return 0;
            return Math.round(((original - discounted) / original) * 100);
          };

          if (sameItemOffers.length > 0) {
            const withPct = sameItemOffers.map((o) => ({ o, pct: computeExistingPct(o) }));
            const bestExisting = withPct.reduce((acc, cur) => (cur.pct > acc.pct ? cur : acc), withPct[0]);
            const newPct = computeNewPct();
            console.log("[Offer Dedup] Existing:", withPct.map(x => ({ id: x.o.id, pct: x.pct })), "New pct:", newPct);

            if (newPct > bestExisting.pct) {
              const idsToDelete = sameItemOffers.map((o) => o.id);
              console.log("[Offer Dedup] New is best. Deleting:", idsToDelete);
              for (const id of idsToDelete) {
                try { await fetchFromHasura(deleteOffer, { id }); } catch (e) { console.error("[Offer Dedup] delete fail", id, e); }
              }
              set({ offers: get().offers.filter((o) => !idsToDelete.includes(o.id)) });
            } else {
              const idsToDelete = sameItemOffers.filter((o) => o.id !== bestExisting.o.id).map((o) => o.id);
              if (idsToDelete.length > 0) {
                console.log("[Offer Dedup] Keeping:", bestExisting.o.id, "Deleting others:", idsToDelete);
                for (const id of idsToDelete) {
                  try { await fetchFromHasura(deleteOffer, { id }); } catch (e) { console.error("[Offer Dedup] delete fail", id, e); }
                }
                set({ offers: get().offers.filter((o) => !idsToDelete.includes(o.id)) });
              } else {
                console.log("[Offer Dedup] Existing best unique. Skipping new.");
              }
              toast.dismiss();
              toast.info("Kept better existing offer for this item.");
              return;
            }
          }
        }

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
            offer_price: offer.offer_price ?? undefined,
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
