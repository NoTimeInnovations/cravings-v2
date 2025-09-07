"use client";
import { UtensilsCrossed } from "lucide-react";
import React from "react";

const Error = ({
  error
}: {
  error: Error & { digest?: string };
}) => {
  return (
    <div className="grid place-content-center w-full min-h-[90vh] opacity-70">
      <UtensilsCrossed className="text-orange-600 h-40 w-40 justify-self-center" />
      <h1 className="text-center mt-2 font-bold text-xl text-orange-600">
        Hotel not found!
      </h1>
      <p className="text-center text-gray-500">
        {error.message || "An unexpected error occurred."}
      </p>
    </div>
  );
};

export default Error;
