"use client";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocationStore } from "@/store/locationStore";


const LocationSelection= () => {
  const { locations } = useLocationStore();
  const searchParams = useSearchParams();
  const location = searchParams.get("location");
  const router = useRouter();

  const setLocation = (location: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (location) {
      params.set("location", location);
    } else {
      params.delete("location");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    router.replace("?" + params.toString());
  };

  return (
    <div className="w-40 md:w-64">
      <Select
        value={location || "all"}
        onValueChange={(value) => setLocation(value === "all" ? null : value)}
      >
        <SelectTrigger className="bg-white focus:ring-orange-600">
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent className="z-[500]">
          <SelectItem value="all">All locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location} value={location}>
              {location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LocationSelection;
