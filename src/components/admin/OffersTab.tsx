import { useEffect, useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { useMenuStore } from "@/store/menuStore_hasura";
import { OfferGroup, useOfferStore } from "@/store/offerStore_hasura";
import { formatDate } from "@/lib/formatDate";
import Img from "../Img";
import { InteractiveOfferCreation, OfferDetails, SelectedItem } from "./InteractiveOfferCreation";
import { OfferCard } from "./OfferCard";




export function OffersTab() {
  const { items } = useMenuStore();
  const { addOffer, fetchPartnerOffers, offers, deleteOffer } = useOfferStore();
  const { userData } = useAuthStore();
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);
  const [isOfferFetched, setIsOfferFetched] = useState(false);
  const [isDeleting, setDeleting] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"list" | "details">("list");
  const [selected, setSelected] = useState<SelectedItem[]>([]);

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

  const handleSubmitDetails = async (details: { percentage?: number; amount?: number; offer_type?: string; start_time?: string; end_time?: string }) => {
    try {
      console.log("[Offer Submit] Details:", details);
      console.log("[Offer Submit] Selected Items:", selected.map(s => ({
        id: s.item.id,
        name: s.item.name,
        hasVariants: !!(s.variants && s.variants.length > 0),
        selectedVariants: s.variants?.map(v => ({ name: v.name, price: v.price })),
        basePrice: s.item.price,
        stock: s.item.stocks && s.item.stocks[0] ? s.item.stocks[0].stock_quantity : undefined,
      })));

      const start_time = details.start_time || new Date().toISOString();
      const end_time = details.end_time || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const offer_type = details.offer_type || 'all';

      const notificationMessage = {
        title: "New Offer",
        body: "A new offer has been added",
      };

      if (selected.length > 1) {
        // Group percentage across each selected item/variant -> create individual offers
        const percentage = details.percentage || 0;
        console.log("[Offer Submit] Multi selection with percentage:", percentage);

        for (const sel of selected) {
          const items_available = sel.item.stocks && sel.item.stocks[0] && typeof sel.item.stocks[0].stock_quantity === 'number'
            ? sel.item.stocks[0].stock_quantity
            : 1;

          // If variants selected, create one offer per selected variant
          if (sel.variants && sel.variants.length > 0) {
            for (const variant of sel.variants) {
              const offer_price = Math.round((variant.price || 0) * (1 - percentage / 100));
              const offerPayload = {
                menu_id: sel.item.id,
                offer_price,
                items_available,
                start_time,
                end_time,
                offer_type,
                variant: {
                  name: variant.name,
                  price: variant.price,
                },
              };
              console.log("[Offer Submit] Creating variant offer:", offerPayload);
              await addOffer(offerPayload, notificationMessage);
            }
          } else {
            // No variants: create a single offer for the base item
            const offer_price = Math.round((sel.item.price || 0) * (1 - percentage / 100));
            const offerPayload = {
              menu_id: sel.item.id,
              offer_price,
              items_available,
              start_time,
              end_time,
              offer_type,
            };
            console.log("[Offer Submit] Creating item offer:", offerPayload);
            await addOffer(offerPayload, notificationMessage);
          }
        }
      } else if (selected.length === 1) {
        const sel = selected[0];
        const items_available = sel.item.stocks && sel.item.stocks[0] && typeof sel.item.stocks[0].stock_quantity === 'number'
          ? sel.item.stocks[0].stock_quantity
          : 1;

        // If multiple variants are selected for a single item, use percentage and create one offer per variant
        if (sel.variants && sel.variants.length > 1 && typeof details.percentage === 'number') {
          const percentage = details.percentage || 0;
          console.log("[Offer Submit] Single item with multiple variants. Percentage:", percentage);
          for (const variant of sel.variants) {
            const offer_price = Math.round((variant.price || 0) * (1 - percentage / 100));
            const offerPayload = {
              menu_id: sel.item.id,
              offer_price,
              items_available,
              start_time,
              end_time,
              offer_type,
              variant: {
                name: variant.name,
                price: variant.price,
              },
            };
            console.log("[Offer Submit] Creating variant offer (single item multi-variant):", offerPayload);
            await addOffer(offerPayload, notificationMessage);
          }
        } else {
          // Single item with no variants or exactly one selected variant: fixed amount path
          let variantToUse = undefined as undefined | { name: string; price: number };
          if (sel.variants && sel.variants.length > 0) {
            variantToUse = sel.variants[0];
          }

          const offerPayload = {
            menu_id: sel.item.id,
            offer_price: details.amount,
            items_available,
            start_time,
            end_time,
            offer_type,
            variant: variantToUse,
          } as any;

          console.log("[Offer Submit] Creating single offer:", offerPayload);
          await addOffer(offerPayload, notificationMessage);
        }
      } else {
        console.warn("[Offer Submit] No items selected. Aborting.");
        return;
      }

      setIsCreateOfferOpen(false);
      setStep("list");
      setSelected([]);
    } catch (error) {
      console.error("[Offer Submit] Error creating offers:", error);
    }
  };

  return (
    <div >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isCreateOfferOpen ? "Add Offers" : "Active Offers"}
        </h2>
        {!isCreateOfferOpen ? (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCreateOfferOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOfferOpen(false);
                setSelected([]);
                setStep("list");
              }}
            >
              Cancel
            </Button>
            {step === "list" && (
              <Button
                onClick={() => {
                  // Only allow next if something is selected
                  if (selected.length > 0) {
                    setStep("details");
                  }
                }}
                disabled={selected.length === 0}
              >
                Next
              </Button>
            )}
            {step === "details" && (
              <Button
                onClick={() => {
                  setStep("list");
                }}
              >
                Back
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tab switch: show create offer form or offer list */}
      {isCreateOfferOpen ? (
        step === "list" ? (
          <InteractiveOfferCreation
            onCancel={() => {
              setIsCreateOfferOpen(false);
              setSelected([]);
              setStep("list");
            }}
            onNext={(sel) => {
              setSelected(sel);
              setStep("details");
            }}
            onSelectionChange={(sel) => setSelected(sel)}
            initialSelected={selected}
          />
        ) : (
          <OfferDetails
            selected={selected}
            onBack={() => setStep("list")}
            onSubmit={handleSubmitDetails}
          />
        )
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
