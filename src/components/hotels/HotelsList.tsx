"use client";

import { Partner } from "@/store/authStore";
import React, { useEffect, useState } from "react";
import PartnerCard from "./PartnerCard";
import { useInView } from "react-intersection-observer";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";
import { getNearByPartnersQuery } from "@/api/partners";
import { useSearchParams } from "next/navigation";
import { getLocationCookie } from "@/app/auth/actions";

const HotelsList = ({ 
  initialPartners,
  initialTotalCount,
  district = "all",
  limit = 10,
  query = ""
}: {
  initialPartners: Partner[];
  initialTotalCount: number;
  district?: string;
  limit?: number;
  query?: string;
}) => {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(initialPartners.length);
  const searchParams = useSearchParams();
  const location = searchParams.get("location") || "";


  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  useEffect(() => {
    setPartners(initialPartners);
    setCurrentOffset(initialPartners.length);
  }, [initialPartners]);

  const loadMorePartners = async () => {
    if (isLoading || (partners.length >= initialTotalCount)) return;

    setIsLoading(true);
    try {
      // Get user location from localStorage?
      const locCookie = await getLocationCookie();
      let userLat = 0;
      let userLng = 0;

      if (locCookie) {
          userLat = locCookie.lat;
          userLng = locCookie.lng;
      }

      const data = await fetchFromHasura(getNearByPartnersQuery, {
        user_lat: userLat,
        user_lng: userLng,
        limit: limit,
        offset: currentOffset,
        district_filter: location ? `%${location}%` : "%",
        search_query: query ? `%${query}%` : "%"
      });
      const newPartners = data.get_all_partners;

      if (newPartners.length) {
        setPartners(prev => [...prev, ...newPartners]);
        setCurrentOffset(prev => prev + limit);
      }

    } catch (error) {
      console.error("Error loading more partners:", error);
      toast.error("Failed to load more hotels");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (inView) {
      loadMorePartners();
    }
  }, [inView]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-lg font-bold mb-4 text-gray-800">
        Discover the Best Hotels in Your Area
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
        {partners.map((partner, index) => (
          <PartnerCard 
            key={`${partner.id}-${index}`} 
            partner={partner} 
            ref={index === partners.length - 1 ? ref : null}
          />
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center mt-8">
          Loading....
        </div>
      )}
    </div>
  );
};

export default HotelsList;