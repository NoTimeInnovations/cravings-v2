"use client";
import Image from "next/image";
import React from "react";

const Error = ({
  error
}: {
  error: Error & { digest?: string };
}) => {
  return (
    <div className="grid place-content-center w-full min-h-[90vh] opacity-70">
      <Image src="/menuthere-logo.png" alt="Menuthere" width={160} height={160} className="h-40 w-40 object-contain justify-self-center" />
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
