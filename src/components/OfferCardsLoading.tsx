import React from "react";

const OfferCardsLoading = () => {
  return (
    <div className="mt-5">
      <div className="grid gap-2 gap-y-5 grid-cols-2 md:grid-cols-4 md:gap-x-5 md:gap-y-10 mt-5 ">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={'loading' + i} className="bg-white w-full h-[277.6px] rounded-xl grid grid-rows-2 overflow-hidden animate-pulse" >
            <div className="bg-gray-200 w-full animate-pulse delay-75" />
            <div className="py-5 px-2 h-fit w-full grid gap-3">

              <div className="bg-gray-200 w-[100%] h-4 rounded-full animate-pulse delay-100" />
              <div className="bg-gray-200 w-[70%] h-4 rounded-full animate-pulse delay-150" />
              <div className="bg-gray-200 w-[50%] h-4 rounded-full animate-pulse delay-200" />


            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default OfferCardsLoading;
