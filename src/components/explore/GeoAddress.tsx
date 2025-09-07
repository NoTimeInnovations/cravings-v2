"use client";
import { MapPin } from "lucide-react";
import React, { useEffect } from "react";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";

const GeoAddress = ({ commonOffer }: { commonOffer: CommonOffer }) => {
  const [geoData, setGeoData] = React.useState<any>(null);

  const getGeoData = async (common_offers_by_pk: CommonOffer) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${common_offers_by_pk?.coordinates?.coordinates[1]}&lon=${common_offers_by_pk?.coordinates?.coordinates[0]}`,{
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MyApp/1.0 (thrishakannan25@gmail.com)',
                'Access-Control-Allow-Origin': '*'
            }
        }
      );
      const data = await response.json();
      setGeoData(data);
      console.log("GeoData for explore offer:", data);
      return data;
    } catch (err) {
      console.error("Failed to get geoData for explore offer", err);
    }
  };

  useEffect(() => {
    getGeoData(commonOffer);
  }, [commonOffer]);

  return (
    <div className="flex items-center gap-3 text-gray-600">
      <MapPin className="w-5 h-5 text-orange-500" />
      <span className="capitalize font-medium">
        {geoData?.display_name || "Unknown Location"}
      </span>
    </div>
  );
};

export default GeoAddress;
