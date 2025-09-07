"use client";

import React from "react";
import CATEGORIES from "@/data/CATEGORIES.json";
import { useRouter } from "next/navigation";
import Image from "next/image";

const CategoryList = ({ hotelId }: { hotelId: string }) => {
  const router = useRouter();
  const handleCategoryClick = (categoryId: number) => {
    router.push(`/hotels/${hotelId}/categories/${categoryId}`);
  };

  return (
    <div className="mt-10">
      <h1 className="text-2xl font-bold ">Menu Categories</h1>
      <div className="grid grid-cols-2 mt-5 lg:grid-cols-4 gap-4 justify-items-center">
        {CATEGORIES.map(category => (
          <div
            key={category.id}
            className="p-4 group rounded-full cursor-pointer flex flex-col items-center justify-center"
            onClick={() => handleCategoryClick(category.id)}
          >
            <Image 
              src={category.image} 
              alt={category.name} 
              width={128}
              height={128}
              className="w-32 aspect-square drop-shadow-lg drop-shadow-black object-cover group-hover:scale-110 transition-all duration-300" 
            />
            <h2 className="font-semibold text-center text-sm">{category.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryList;