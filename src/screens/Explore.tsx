"use client";
import { getAllCommonOffers } from "@/api/common_offers";
import { getLocationCookie, setLocationCookie } from "@/app/auth/actions";
import CommonOfferCard from "@/components/explore/CommonOfferCard";
import LocationSelection from "@/components/LocationSelection";
import NoOffersFound from "@/components/NoOffersFound";
import OfferCardsLoading from "@/components/OfferCardsLoading";
import SearchBox from "@/components/SearchBox";
import { CommonOffer } from "@/components/superAdmin/OfferUploadSuperAdmin";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { saveUserLocation } from "@/lib/saveUserLocLocal";
import { MapPin, Navigation, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

const Explore = ({
  commonOffers,
  limit,
  totalOffers,
  initialDistrict,
  initialSearchQuery,
  hasUserLocation = false,
}: {
  commonOffers: CommonOffer[];
  limit: number;
  totalOffers: number;
  initialDistrict: string | null;
  initialSearchQuery: string;
  hasUserLocation?: boolean;
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offers, setOffers] = useState<CommonOffer[]>(commonOffers);
  const [currentDistrict] = useState(initialDistrict);
  const [currentSearchQuery] = useState(initialSearchQuery);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const { ref, inView } = useInView();
  const searchParams = useSearchParams();

  useEffect(() => {
    saveUserLocation();
  }, [initialDistrict, hasUserLocation]);

  const loadMore = async () => {
    if (!inView || isLoadingMore || offers.length >= totalOffers) return;

    setIsLoadingMore(true);

    try {
      const variables: Record<string, any> = {
        limit_count: limit,
        offset_count: offers.length + 1,
      };

      if (currentDistrict) {
        variables.district_filter = currentDistrict;
      }

      if (currentSearchQuery) {
        variables.search_query = `%${currentSearchQuery}%`;
      }

      const locationCookie = await getLocationCookie();

      variables.user_lat = locationCookie?.lat || 0;
      variables.user_lng = locationCookie?.lng || 0;

      const response = await fetchFromHasura(
        getAllCommonOffers(locationCookie || undefined),
        variables
      );

      if (response?.get_offers_near_location?.length) {
        const filteredOffers = response?.get_offers_near_location.filter(
          (offer: CommonOffer, index: number, self: CommonOffer[]) => {
            // Condition 1: If the offer has no partner_id, always keep it.
            if (!offer.partner_id) {
              return true;
            }

            // Condition 2: If it has a partner_id, only keep it if it's the first
            // occurrence of that partner_id in the entire array.
            return (
              index === self.findIndex((o) => o.partner_id === offer.partner_id)
            );
          }
        );

        setOffers((prev) => [...prev, ...filteredOffers]);
      }
    } catch (error) {
      console.error("Error loading more offers:", error);
      toast.error("Failed to load more offers");
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadMore();
  }, [inView]);

  useEffect(() => {
    setOffers(commonOffers);
  }, [commonOffers]);

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
    <div className="min-h-[100dvh] w-full bg-orange-50 px-3 py-3 relative pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-start">
          <button
            onClick={refreshLocation}
            disabled={isRefreshingLocation}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-orange-300 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            <Navigation
              className={`w-4 h-4 ${
                isRefreshingLocation ? "animate-spin" : ""
              }`}
            />
            <span>Refresh Location</span>
          </button>
        </div>
        <div className="flex justify-between items-start md:items-center gap-3 my-4">
          <div className="flex flex-col">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">
              Explore Delicious Foods
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LocationSelection />
          </div>
        </div>

        <SearchBox />

        <section className="mt-5">
          {offers.length > 0 ? (
            <>
              <div className="grid gap-2 gap-y-5 grid-cols-2 md:grid-cols-4 md:gap-x-5 md:gap-y-10">
                {offers.map((offer, index) => (
                  <div
                    key={offer.id}
                    ref={index === offers.length - 1 ? ref : null}
                  >
                    <CommonOfferCard commonOffer={offer} />
                  </div>
                ))}
              </div>
              {isLoadingMore && <OfferCardsLoading />}
            </>
          ) : (
            <NoOffersFound />
          )}
        </section>
      </div>
    </div>
  );
};

export default Explore;
