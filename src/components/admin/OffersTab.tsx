import { useEffect, useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { useMenuStore } from "@/store/menuStore_hasura";
import { OfferGroup, useOfferStore } from "@/store/offerStore_hasura";
import { formatDate } from "@/lib/formatDate";
import Img from "../Img";
import { CreateOfferForm } from "./CreateOfferForrm";
import { OfferCard } from "./OfferCard";




export function OffersTab() {
  const { items } = useMenuStore();
  const { addOffer, fetchPartnerOffers, offers, deleteOffer } = useOfferStore();
  const { userData } = useAuthStore();
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);
  const [isOfferFetched, setIsOfferFetched] = useState(false);
  const [isDeleting, setDeleting] = useState<Record<string, boolean>>({});

  const handleOfferDelete = (id: string) => async () => {
    setDeleting({
      ...isDeleting,
      [id]: true,
    });
    await deleteOffer(id);
    setDeleting({
      ...isDeleting,
      [id]: false,
    });
  };

  useEffect(() => {
    (async () => {
      if (userData) {
        await fetchPartnerOffers();
        setTimeout(() => {
          setIsOfferFetched(true);
        }, 2000);
      }
    })();
  }, [userData]);

  const handleCreateOffer = async (
    offer: {
      menu_id?: string;
      offer_price?: number;
      items_available?: number;
      start_time: string;
      end_time: string;
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
  ) => {
    await addOffer(offer , notificationMessage);
    setIsCreateOfferOpen(false);
  };

  return (
    <div >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Active Offers</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsCreateOfferOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab switch: show create offer form or offer list */}
      {isCreateOfferOpen ? (
        <CreateOfferForm
          onSubmit={handleCreateOffer}
          onCancel={() => setIsCreateOfferOpen(false)}
        />
      ) : (
        <>
          {offers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => {
                return (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isDeleting={!!isDeleting[offer.id]}
                    onDelete={handleOfferDelete(offer.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center mt-4">
              {isOfferFetched ? "No Offers Found!" : "Loading Offers...."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
