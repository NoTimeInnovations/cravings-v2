import { MenuItem } from "@/store/menuStore_hasura";
import React from "react";
import { Card, CardContent } from "../ui/card";
import { usePOSStore } from "@/store/posStore";
import { Partner, useAuthStore } from "@/store/authStore";
import { Button } from "../ui/button";
import { ChevronDown, Minus, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // Ensure you have Popover components

const PosItemCard = ({ item }: { item: MenuItem }) => {
  const { addToCart, cartItems, decreaseQuantity, removeFromCart } = usePOSStore();
  const { userData } = useAuthStore();
  const hasVariants = item.variants && item.variants.length > 0;

  // Helper function to render quantity controls, unchanged
  const renderQuantityControls = (itemId: string, itemData: MenuItem) => {
    const cartItem = cartItems.find((i) => i.id === itemId);

    if (!cartItem) {
      return (
        <Button
          size="sm"
          className="h-8 bg-black hover:bg-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(itemData);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 bg-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            if (cartItem.quantity > 1) {
              decreaseQuantity(itemId);
            } else {
              removeFromCart(itemId);
            }
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-6 text-center text-sm font-medium">
          {cartItem.quantity}
        </span>
        <Button
          size="sm"
          className="h-8 w-8 bg-black hover:bg-gray-800"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(itemData);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  };


  // If the item HAS VARIANTS, render it inside a Popover
  if (hasVariants) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-base">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {(item.variants ?? []).length} options available
                  </p>
                </div>
                <div className="h-8 w-8 flex items-center justify-center">
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-96 lg:w-[500px] rounded-2xl px-4" onClick={(e) => e.stopPropagation()}>
          <div className="grid gap-4">
             
            <div className="grid gap-3">
                {(item.variants ?? []).map((variant) => {
                const variantId = `${item.id}|${variant.name}`;
                const variantItem = {
                    ...item,
                    id: variantId,
                    price: variant.price,
                    name: `${item.name} (${variant.name})`,
                    variants: []
                };

                return (
                    <div
                    key={variant.name}
                    className="flex items-center justify-between"
                    >
                    <div>
                        <p className="text-sm font-medium">{variant.name}</p>
                        <p className="text-sm text-gray-600">
                        {(userData as Partner)?.currency}
                        {variant.price}
                        </p>
                    </div>
                    {renderQuantityControls(variantId, variantItem)}
                    </div>
                );
                })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // If the item has NO VARIANTS, render the simple card
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-medium text-base">{item.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {(userData as Partner)?.currency}
              {item.price}
            </p>
          </div>
          {renderQuantityControls(item.id!, item)}
        </div>
      </CardContent>
    </Card>
  );
};

export default PosItemCard;