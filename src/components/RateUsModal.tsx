"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Rating } from "@smastrom/react-rating";


const RateUsModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    localStorage?.setItem("rateUsModal", "closed");
  };

  useEffect(() => {
    const isRateUsModalClosed = localStorage?.getItem("rateUsModal");
    if (!isRateUsModalClosed) {
      setIsOpen(true);
    }
  } , []);

  return (
    <Dialog open={isOpen}>
      <DialogContent className="w-[90%] rounded-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Enjoy using Cravings?
          </h2>
          <p className="text-sm text-gray-500 text-pretty pt-1">
            Please rate us on the play store.
          </p>
        </div>

        <div className="flex justify-center">
          <Rating value={5} style={{ maxWidth: 220 }} />
        </div>

        <div className="grid grid-cols-2">
          <div onClick={handleClose} className="text-center p-2 font-medium cursor-pointer">
            Cancel
          </div>
          <div onClick={()=>{
            window.open('https://play.google.com/store/apps/details?id=com.notime.cravings&pcampaignid=web_share', '_blank');
            handleClose();
          }} className="text-center p-2 font-semibold cursor-pointer text-orange-600 hover:text-orange-500 ">
            Rate Now
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RateUsModal;
