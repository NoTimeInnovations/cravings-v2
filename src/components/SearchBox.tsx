"use client";
import { Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { useRouter, useSearchParams } from "next/navigation";

const SearchBox = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("query") || "");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("query", query);
      } else {
        params.delete("query");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      router.replace("?" + params.toString());
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchParams, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="relative group px-4">
      <Search className="absolute left-8 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-orange-600" />
      <Input
        type="text"
        placeholder="Search Dishes or Hotels"
        value={query}
        onChange={handleInputChange}
        className="pl-10 w-full bg-white group-focus-within:ring-orange-600"
      />
    </div>
  );
};

export default SearchBox;
