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

  // Helper function to render quantity controls
  const renderQuantityControls = (itemId: string, itemData: MenuItem) => {
    const cartItem = cartItems.find((i) => i.id === itemId);

    if (!cartItem) {
      return (
        <Button
          size="sm"
          className="h-7 w-7 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shrink-0"
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
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0 rounded-md border-input bg-background hover:bg-accent hover:text-accent-foreground"
          onClick={(e) => {
            e.stopPropagation();
            if (cartItem.quantity > 1) {
              decreaseQuantity(itemId);
            } else {
              removeFromCart(itemId);
            }
          }}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-4 text-center text-sm font-semibold text-foreground">
          {cartItem.quantity}
        </span>
        <Button
          size="sm"
          className="h-7 w-7 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(itemData);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  };


  // If the item HAS VARIANTS, render it inside a Popover
  if (hasVariants) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Card className="h-full hover:shadow-md transition-all cursor-pointer border shadow-sm group active:scale-[0.98] duration-200 bg-card">
            <CardContent className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-card-foreground mb-1.5 min-h-[2.5em]">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full w-fit">
                    <span>{(item.variants ?? []).length} options</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-80 md:w-96 p-3 shadow-xl rounded-xl" align="end" sideOffset={5} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-2 text-foreground">{item.name} - Options</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
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
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{variant.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">
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
    <Card className="h-full hover:shadow-md transition-all border shadow-sm group active:scale-[0.98] duration-200 bg-card">
      <CardContent className="p-3">
        <div className="flex justify-between items-start gap-2 h-full">
          <div className="flex-1 flex flex-col min-w-0 justify-between h-full">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-card-foreground mb-2 min-h-[2.5em]">
              {item.name}
            </h3>
            <p className="text-sm font-bold text-card-foreground">
              {(userData as Partner)?.currency}
              {item.price}
            </p>
          </div>
          <div className="pt-0.5">
            {renderQuantityControls(item.id!, item)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PosItemCard;