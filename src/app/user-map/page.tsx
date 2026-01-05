"use client";

import UsersMap from "@/components/UsersMap";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useEffect, useState } from "react";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

const Page = () => {
  const [data, setData] = useState<{ partners: any[], users: any[], temp_users: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const partnersQuery = `query MyQuery {
            partners(where: {geo_location: {_is_null: false} , status: {_eq: "active"}}) {
                geo_location
                store_name
                store_banner
                status
                country
                district
                id
            }
            }`;
        const usersQuery = `query MyQuery {
            users(where: {location: {_is_null: false}}) {
                location
                phone
                id
            }
            }`;
        const tempUsersQuery = `query MyQuery {
            temp_user_loc(where: {location: {_is_null: false}}) {
                location
                id
            }
            }`;

        const [partnersRes, usersRes, tempUsersRes] = await Promise.all([
          fetchFromHasura(partnersQuery),
          fetchFromHasura(usersQuery),
          fetchFromHasura(tempUsersQuery)
        ]);

        setData({
          partners: partnersRes.partners || [],
          users: usersRes.users || [],
          temp_users: tempUsersRes.temp_user_loc || []
        });
      } catch (error) {
        console.error("Failed to fetch map data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <FullScreenLoader isLoading={true} loadingTexts={["Loading User Map...", "Fetching Locations..."]} />;
  }

  if (!data) {
    return <div className="flex h-screen items-center justify-center">Failed to load map data</div>;
  }

  return <UsersMap partners={data.partners} users={data.users} temp_users={data.temp_users} />;
};

export default Page;
