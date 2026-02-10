"use client";
import HotelsList from "@/components/hotels/HotelsList";
import RecentVisits from "@/components/hotels/RecentVisits";
import LocationSelection from "@/components/LocationSelection";
import SearchBox from "@/components/SearchBox";
import { Partner } from "@/store/authStore";
import { setLocationCookie } from "@/app/auth/actions";
import { Navigation } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveUserLocation } from "@/lib/saveUserLocLocal";

const HotelsPage = ({
  partnersData,
  recentVisitsData,
  district = "%",
  hasUserLocation = false,
  limit = 10,
  query = "%",
}: {
  partnersData: {
    partners: Partner[];
    totalCount: number;
  };
  recentVisitsData: {
    recentVisits: Partner[];
    totalCount: number;
  };
  district?: string;
  hasUserLocation?: boolean;
  limit?: number;
  query?: string;
}) => {
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // useEffect(() => {
  //   saveUserLocation();
  // }, [hasUserLocation]);

  const refreshLocation = () => {
    setIsRefreshingLocation(true);
    console.log("REFRESH LOCATION");
    toast.info("Updating your location...");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            if (latitude && longitude) {
              await setLocationCookie(latitude, longitude);
              toast.success("Location updated successfully");
              window.location.reload();
            }
          } catch (error) {
            console.error("Error setting location:", error);
            toast.error("Failed to update location");
            setIsRefreshingLocation(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Failed to access your location");
          setIsRefreshingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // Force fresh location
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
      setIsRefreshingLocation(false);
    }
  };

  return (
    <div className="sm:px-[15%]">
      <RecentVisits
        initialRecentVisits={recentVisitsData.recentVisits}
        totalCount={recentVisitsData.totalCount}
      />
      <div className="flex justify-start px-4 mt-4">
        <button
          onClick={refreshLocation}
          disabled={isRefreshingLocation}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-orange-300 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50"
        >
          <Navigation
            className={`w-4 h-4 ${isRefreshingLocation ? "animate-spin" : ""}`}
          />
          <span>Refresh Location</span>
        </button>
      </div>
      <div className="pr-4 flex justify-between items-center mt-4">
        <SearchBox />
        <LocationSelection />
      </div>
      <HotelsList
        initialPartners={partnersData.partners}
        initialTotalCount={partnersData.totalCount}
        district={district}
        limit={limit}
        query={query}
      />
    </div>
  );
};

export default HotelsPage;
