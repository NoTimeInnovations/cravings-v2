import { Loader2 } from "lucide-react";
import React from "react";

const OfferLoadinPage = ({ message }: { message: string }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-orange-50 to-orange-100 flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        <span className="text-lg text-gray-600">{message}</span>
      </div>
    </div>
  );
};

export default OfferLoadinPage;
