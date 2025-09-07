// import Image from "next/image";
import React from "react";

const DiscountBadge = ({ discount }: { discount: number }) => {
  return (
    <>
      {/* normal  */}
      <div className="badge-clip absolute top-0 right-0 text-white bg-red-600 grid text-center p-2 animate-in">
        <span className="font-bold text-base">{discount}%</span>
        <span className="font-medium text-sm">OFF</span>
      </div>

      {/* christmas  */}
      {/* <div className="absolute top-0 right-0 text-white bg-red-600 grid text-center p-2 animate-in">
        <span className="font-bold text-xl z-10">{discount}%</span>
        <span className="font-medium text-sm z-10">OFF</span>

        <Img
          src="/christmas_banner_ball.webp"
          alt="christmas badge"
          width={400}
          priority={false}
          height={400}
          className=" absolute top-0 left-0"
        />
      </div> */}
    </>
  );
};

export default DiscountBadge;
