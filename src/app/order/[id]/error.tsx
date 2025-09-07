"use client";
import { UtensilsCrossed } from "lucide-react";
import React from "react";

const Error = () => {
  return (
    <div className="grid place-content-center w-full min-h-[90vh] opacity-70">
      <UtensilsCrossed className="text-orange-600 h-40 w-40 justify-self-center" />
      <h1 className="text-center mt-2 font-bold text-xl text-orange-600">
        Order Not Found!
      </h1>
    </div>
  );
};

export default Error;
