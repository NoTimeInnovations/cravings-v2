"use client";

import { sendCommonOfferWhatsAppMsg } from "@/app/actions/sendWhatsappMsgs";
import { Send } from "lucide-react";
import React from "react";
import { toast } from "sonner";

const ResendOfferMsgBtn = ({ id }: { id: string }) => {
  const handleResend = async () => {
    try {
      toast.loading("Resending the offer...");
      await sendCommonOfferWhatsAppMsg(id);
      toast.dismiss();
      toast.success("Offer resent successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Error resending offer. Please try again.");
      console.error("Error resending offer:", error);
    }
  };

  return (
    <button
      onClick={handleResend}
      className="flex items-end gap-2 text-green-600 text-sm"
    >
      {" "}
      <Send size={20} /> Resend Offer
    </button>
  );
};

export default ResendOfferMsgBtn;
