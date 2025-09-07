"use client";
import React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import HeadingWithAccent from "@/components/HeadingWithAccent";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { X } from "lucide-react";
import Img from "@/components/Img";

const ItemDetailsModal = ({
  open,
  setOpen,
  item,
  styles,
  currency,
  hotelData
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: HotelDataMenus;
  styles: Styles;
  currency: string;
  hotelData: HotelData;
}) => {
  const hasVariants = (item.variants?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent style={styles.border} className="rounded-[35px] w-[90%] flex h-auto max-h-[90%] overflow-y-auto  ">
        <DialogTitle className="hidden">{item.name}</DialogTitle>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <DialogClose>
                <X size={25} />
              </DialogClose>
            </div>
            <div className="flex justify-between items-start">
              <HeadingWithAccent
                accent={styles.accent}
                className="text-2xl font-black capitalize max-w-[230px]"
              >
                {item.name}
              </HeadingWithAccent>

              <div
                style={{
                  color: styles.accent,
                }}
                className="font-black text-3xl"
              >
                {currency !== "🚫" && (
                  <div
                    style={{
                      color: !item.is_available ? styles.color : styles.accent,
                    }}
                    className={`font-black text-2xl`}
                  >
                    {currency}{" "}
                    {hotelData?.id === "767da2a8-746d-42b6-9539-528b6b96ae09" ? item.price.toFixed(3) : item.price}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm opacity-50 mt-1">{item.description}</div>
          </div>

          {item.image_url && (
           <div className="w-full h-[200px] overflow-hidden rounded-3xl">
             <Img
              src={item.image_url}
              alt={item.name}
              className="w-full h--full object-cover rounded-3xl"
            />
           </div>
          )}
          
          {hasVariants && (
            <div className="w-full space-y-3">
              {item.variants?.map((variant) => (
                <div
                  key={variant.name}
                  className="p-3 rounded-lg flex justify-between items-center gap-5 w-full"
                  style={styles.border}
                >
                  <div className="grid">
                    <span className="font-semibold">{variant.name}</span>
                    <div
                      style={{
                        color: !item.is_available ? styles.color : styles.accent,
                      }}
                      className="text-xl font-black"
                    >
                      {currency}{" "}
                      {hotelData?.id === "767da2a8-746d-42b6-9539-528b6b96ae09"
                        ? variant.price.toFixed(3)
                        : variant.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
         
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailsModal;