"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const LocationAccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userLocation = localStorage?.getItem("loc");
    const url = new URLSearchParams(searchParams.toString());
    
    // Get existing lat/lon from URL if they exist
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (lat && lon) {
      // If lat/lon already exist in URL, just save to localStorage?
      localStorage?.setItem("loc", "?" + url.toString());
    } else if (userLocation) {
      // If we have a saved location but no lat/lon in URL, use the saved location
      router.replace(userLocation);
    }
  }, []);

  return <></>;
};

export default LocationAccess;
