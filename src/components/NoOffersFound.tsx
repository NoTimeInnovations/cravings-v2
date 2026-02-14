import React from "react";
import Image from "next/image";

const NoOffersFound = () => {
  return (
    <div className="grid place-content-center w-full min-h-[60vh] opacity-70">

      <Image src="/menuthere-logo.png" alt="Menuthere" width={160} height={160} className="h-40 w-40 object-contain justify-self-center" />
      <h1 className="text-center mt-2 font-bold text-xl text-orange-600">No Offers found!</h1>

    </div>
  );
};

export default NoOffersFound;
