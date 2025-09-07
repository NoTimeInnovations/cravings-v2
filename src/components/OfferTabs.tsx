"use client";
import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

const tabs = ["all", "popular", "money saver"];

const OfferTabs = () => {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.replace("?" + params.toString());
  };

  return (
    <div
      className={`w-full my-5 md:my-10 sticky top-5 z-50 left-0 overflow-clip rounded-lg ${
        scrollY > 0 ? "shadow-lg" : ""
      }`}
    >
      <Tabs
        onValueChange={handleValueChange}
        defaultValue={filter}
        className="w-full"
      >
        <TabsList className="w-full h-fit p-2 m-0 bg-orange-100">
          {tabs.map((tab) => (
            <TabsTrigger className="capitalize w-full" key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default OfferTabs;
