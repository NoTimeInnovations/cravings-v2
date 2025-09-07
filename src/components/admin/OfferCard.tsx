import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Offer, OfferGroup } from "@/store/offerStore_hasura";
import { formatDate } from "@/lib/formatDate";
import { HotelData } from "@/app/hotels/[...id]/page";
import { useAuthStore } from "@/store/authStore";
import { MenuItem } from "@/store/menuStore_hasura";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface OfferCardProps {
  offer: {
    id: string;
    menu?: MenuItem;
    offer_price?: number;
    items_available?: number;
    start_time: string;
    end_time: string;
    created_at: string;
    offerGroup?: OfferGroup;
    variant?: {
      name: string;
      price: number;
    };
  };
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

export function OfferCard({ offer, isDeleting, onDelete }: OfferCardProps) {
  const { userData } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  const isGroupOffer = !!offer.offerGroup;
  const currency = (userData as HotelData)?.currency || "₹";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>
            {isGroupOffer ? offer?.offerGroup?.name : offer.menu?.name}
            {!isGroupOffer && offer.variant && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({offer.variant.name})
              </span>
            )}
          </span>
          {isGroupOffer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide Items" : "Show Items"}
            </Button>
          )}
        </CardTitle>
        {!isGroupOffer && offer.menu?.image_url && (
          <div className="relative w-32 h-32 rounded-md overflow-hidden">
            <img
              src={offer.menu.image_url}
              alt={offer.menu.name}
              className="object-cover w-full h-full"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {isGroupOffer ? (
            <>
              <p className="text-lg">
                Discount: {offer?.offerGroup?.percentage}% off
              </p>
              <p className="text-sm">{offer?.offerGroup?.description}</p>

              {expanded && (
                <div className="mt-2 border-t pt-2">
                  <h4 className="font-medium mb-2">Included Items:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(offer?.offerGroup?.menu_items ?? [])?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox checked disabled />
                        <span className="text-sm">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {((offer.variant ? offer.variant.price : offer.menu?.price) ??
                0) > 0 && (
                <p className="text-lg">
                  Original Price: {currency}
                  {offer.variant
                    ? offer.variant.price.toFixed(2)
                    : offer.menu?.price.toFixed(2)}
                </p>
              )}
              {(offer.offer_price ?? 0) > 0 && (
                <p className="text-2xl font-bold text-green-600">
                  Offer Price: {currency}
                  {offer.offer_price?.toFixed(2)}
                </p>
              )}
              {offer.items_available !== undefined && (
                <p className="text-sm">Available: {offer.items_available}</p>
              )}
            </>
          )}

          <div className="text-sm text-gray-500 space-y-1 mt-2">
            <p>From: {formatDate(offer.start_time)}</p>
            <p>To: {formatDate(offer.end_time)}</p>
            <p>Created At: {formatDate(offer.created_at)}</p>
          </div>

          <Button
            disabled={isDeleting}
            variant="destructive"
            className="w-full mt-4"
            onClick={() => onDelete(offer.id)}
          >
            {isDeleting ? "Deleting..." : "Delete Offer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
