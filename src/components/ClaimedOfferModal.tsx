import { Offer } from "@/store/offerStore_hasura";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import Image from "next/image";
import { Button } from "./ui/button";
import DiscountBadge from "./DiscountBadge";
import Link from "next/link";
import Img from "./Img";

const ClaimedOfferModal = ({
  isOpen,
  setOpen,
  offer,
}: {
  isOpen: boolean;
  setOpen: (value: boolean) => void;
  offer: Offer;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="w-[300px] rounded-xl p-0 border-none outline-none overflow-hidden">
        <DialogTitle className="hidden">Offer Claimed</DialogTitle>

        <DiscountBadge discount={23} />

        <DialogHeader>
          <Img
            src={offer.menu.image_url}
            alt={offer.menu.name}
            width={300}
            height={300}
            className="rounded-xl"
          />
        </DialogHeader>

        <div className="flex flex-col gap-2 p-5">
          <h1 className="text-xl font-semibold text-center">Offer Claimed!</h1>
          <p className="text-sm text-center text-black/70">
            You have successfully claimed the offer. Enjoy your meal!
          </p>

          <Link href={offer.partner?.location as string} className=" mt-5 w-full flex justify-center py-2 px-3 text-[15px] font-semibold transition-all text-white bg-orange-600 hover:bg-orange-700 rounded-sm">
            Go to Hotel
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimedOfferModal;
