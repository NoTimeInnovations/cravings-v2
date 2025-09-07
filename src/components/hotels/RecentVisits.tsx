"use client";

import { Partner, useAuthStore } from "@/store/authStore";
import React, { useState, useEffect } from "react";
import PartnerCard from "./PartnerCard";
import { useInView } from "react-intersection-observer";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { toast } from "sonner";
import { getFollowersQuery } from "@/api/followers";

const RECENT_VISITS_LIMIT = 10;

const RecentVisits = ({
  initialRecentVisits,
  totalCount = 0,
}: {
  initialRecentVisits: Partner[];
  totalCount?: number;
}) => {
  const { userData } = useAuthStore();
  const [recentVisits, setRecentVisits] =
    useState<Partner[]>(initialRecentVisits);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(initialRecentVisits.length || 0);

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  const loadMoreRecentVisits = async () => {
    if (isLoading || initialRecentVisits.length >= totalCount) return;

    setIsLoading(true);
    try {
      const variables = {
        userId: userData?.id || null,                                                   
        limit: RECENT_VISITS_LIMIT,
        offset,
      };

      const data = await fetchFromHasura(getFollowersQuery, variables);
      const newVisits = data.followers.map((f: any) => f.partner);

      if (newVisits.length > 0) {
        setRecentVisits((prev) => [...prev, ...newVisits]);
        setOffset((prev) => prev + RECENT_VISITS_LIMIT);
      }
    } catch (error) {
      console.error("Error loading more recent visits:", error);
      toast.error("Failed to load more recent visits");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (inView && userData && userData.id) {
      loadMoreRecentVisits();
    }
  }, [inView , userData]);

  if (recentVisits.length === 0) return null;

  return (
    <div className="w-full px-4 py-6">
      <h1 className="text-lg font-bold mb-4 text-gray-800">Recent Visits</h1>
      <div className="flex overflow-x-scroll pb-4 space-x-2 scrollbar-hide whitespace-nowrap">
        {recentVisits.map((partner, index) => (
          <PartnerCard
            key={`${partner.id}-recentVisit-${index}`}
            partner={partner}
            imageWidth="200px"
            ref={index === recentVisits.length - 1 ? ref : null}
          />
        ))}
        {isLoading && (
          <div className="flex items-center justify-center min-w-[200px]">
            <div>Loading....</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentVisits;
