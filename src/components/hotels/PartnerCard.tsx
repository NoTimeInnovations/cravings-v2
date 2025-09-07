import { Partner } from "@/store/authStore";
import Image from "next/image";
import React from "react";

const PartnerCard = ({
  partner,
  imageWidth,
  ref
}: {
  partner: Partner;
  imageWidth?: string;
  ref?: React.Ref<HTMLAnchorElement>;
}) => {
  // Convert meters to kilometers and round to 1 decimal place
  const distanceInKm = partner.distance_meters ? (partner.distance_meters / 1000).toFixed(1) : null;
  const shouldShowDistance = distanceInKm && parseFloat(distanceInKm) < 300;

  return (
    <a
      ref={ref}
      href={`/hotels/${partner.id}`}
      style={{
        width: imageWidth || "100%",
      }}
      className="bg-white rounded-3xl flex-shrink-0 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col border-2 overflow-hidden"
    >
      <div
        style={{
          width:  imageWidth || "100%",
          maxWidth: imageWidth || "100%",
        }}
        className="relative h-28"
      >
        <Image
          src={partner.store_banner || "/default-banner.jpg"}
          alt={partner.store_name}
          fill
          className="object-cover rounded-t-lg"
          priority={false}
        />
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-sm md:text-base font-semibold text-gray-800 line-clamp-1">
            {partner.store_name}
          </h2>
        </div>

        <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">
          {partner.district}
          {shouldShowDistance && (
            <span className="block text-xs text-gray-500">
              {distanceInKm} km away
            </span>
          )}
        </p>
      </div>
    </a>
  );
};

export default PartnerCard;
