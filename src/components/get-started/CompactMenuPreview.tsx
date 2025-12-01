"use client";

import React, { useState } from "react";
import Image from "next/image";
import { UtensilsCrossed, Phone, MapPin, Search } from "lucide-react";
import SocialLinks from "../hotelDetail/styles/Compact/SocialLinks";

interface MenuItem {
    name: string;
    price: number;
    description: string;
    category: string;
    image?: string;
    variants?: { name: string; price: number }[];
    is_veg?: boolean;
}

interface HotelDetails {
    name: string;
    banner?: string;
    phone: string;
    country: string;
}

interface CompactMenuPreviewProps {
    items: MenuItem[];
    hotelDetails: HotelDetails;
}

export const CompactMenuPreview: React.FC<CompactMenuPreviewProps> = ({
    items,
    hotelDetails,
}) => {
    const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);

    const categories = Object.keys(groupedItems);

    // Check if any items have veg info
    const hasVegFilter = items.some(item => item.is_veg !== null && item.is_veg !== undefined);

    return (
        <div className="w-full max-w-md mx-auto bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-200 min-h-[600px] md:h-[600px] md:min-h-0 flex flex-col relative">
            {/* Header / Banner - matching Compact.tsx styling */}
            <div className="relative">
                <div className="w-full h-48 relative overflow-hidden bg-gray-100">
                    {hotelDetails.banner ? (
                        <img
                            src={hotelDetails.banner}
                            alt={hotelDetails.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-400">
                            {/* Placeholder */}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Hotel details - absolutely positioned */}
                <div className="absolute bottom-0 gap-2 left-0 w-full p-5 bg-gradient-to-t from-black to-transparent text-white">
                    <h1 className="text-xl font-semibold w-[200px]">
                        {hotelDetails.name}
                    </h1>
                    {hotelDetails.country && (
                        <div className="inline-flex gap-2 text-sm">
                            <MapPin size={15} />
                            <span>{hotelDetails.country}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Links  */}
            <div className="p-4 flex items-center gap-2 max-w-full overflow-x-scroll scrollbar-hide">
                <SocialLinks socialLinks={{
                    phone: hotelDetails.phone,
                    whatsapp: `https://wa.me/${hotelDetails.phone}`,
                }} />
            </div>

            {/* Search Bar */}
            <div className="p-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search for dishes..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                        disabled
                    />
                </div>
            </div>

            {/* Veg/Non-Veg Filter */}
            {hasVegFilter && (
                <div className="px-4 flex gap-2 flex-wrap pb-2">
                    <button
                        onClick={() => setVegFilter("all")}
                        className={`border font-semibold text-xs text-nowrap rounded-full px-3 py-1.5 transition-colors ${vegFilter === "all"
                            ? "bg-orange-600 text-white border-orange-600"
                            : "bg-white text-black border-gray-200"
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setVegFilter("veg")}
                        className={`border font-semibold text-xs text-nowrap rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors ${vegFilter === "veg"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-black border-gray-200"
                            }`}
                    >
                        <div className={`w-2.5 h-2.5 border-[1.5px] ${vegFilter === "veg" ? "border-white" : "border-green-600"} flex items-center justify-center`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${vegFilter === "veg" ? "bg-white" : "bg-green-600"}`}></div>
                        </div>
                        Veg
                    </button>
                    <button
                        onClick={() => setVegFilter("non-veg")}
                        className={`border font-semibold text-xs text-nowrap rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors ${vegFilter === "non-veg"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-black border-gray-200"
                            }`}
                    >
                        <div className={`w-2.5 h-2.5 border-[1.5px] ${vegFilter === "non-veg" ? "border-white" : "border-red-600"} flex items-center justify-center`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${vegFilter === "non-veg" ? "bg-white" : "bg-red-600"}`}></div>
                        </div>
                        Non-Veg
                    </button>
                </div>
            )}

            {/* Categories Navigation - Sticky */}
            <div className="overflow-x-auto w-full flex gap-2 p-2 sticky top-0 z-10 bg-white shadow-md scrollbar-hide border-b border-gray-100 relative">
                {/* Animated border element */}
                <div
                    className="absolute bottom-0 left-0 h-0.5 bg-orange-600 transition-all duration-300 ease-in-out"
                    style={{
                        width: `${100 / categories.length}%`,
                        transform: `translateX(${activeCatIndex * 100}%)`,
                    }}
                />

                {categories.map((category, index) => (
                    <div
                        key={category}
                        onClick={() => setActiveCatIndex(index)}
                        className={`p-3 text-nowrap cursor-pointer flex-shrink-0 ${activeCatIndex === index ? "font-semibold text-orange-600" : "font-medium text-gray-600"
                            }`}
                    >
                        {category}
                    </div>
                ))}
            </div>

            {/* Menu Content - matching Compact.tsx grid structure */}
            <div className="grid gap-4 p-4 pb-24 overflow-y-auto scrollbar-hide max-h-[500px] md:max-h-none md:flex-1">
                {Object.entries(groupedItems).map(([category, categoryItems]) => {
                    // Filter items based on veg filter
                    const filteredItems = categoryItems.filter(item => {
                        if (vegFilter === "all" || !hasVegFilter) return true;
                        if (vegFilter === "veg") return item.is_veg === true;
                        if (vegFilter === "non-veg") return item.is_veg === false;
                        return true;
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                        <section key={category} className="py-4">
                            <h2 className="text-xl font-bold text-orange-600 py-4">
                                {category}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 divide-y-2 divide-gray-200">
                                {filteredItems.map((item, index) => (
                                    <div key={index} className="p-4 flex gap-3 relative">
                                        {/* Item Details (Left) - matching reference image */}
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="flex items-start gap-2">
                                                {/* Veg/Non-Veg Indicator */}
                                                {item.is_veg !== null && item.is_veg !== undefined && (
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        {item.is_veg === false ? (
                                                            <div className="w-4 h-4 border border-red-600 flex items-center justify-center">
                                                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 border border-green-600 flex items-center justify-center">
                                                                <div className="w-2 h-2 rounded-full bg-green-600"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <h3 className="font-semibold text-gray-900 text-base">
                                                    {item.name}
                                                </h3>
                                            </div>

                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {item.description}
                                            </p>

                                            {/* Price on bottom left */}
                                            <div className="mt-3 text-lg font-semibold text-orange-600">
                                                {item.variants && item.variants.length > 0 ? (
                                                    <>From $ {item.price}</>
                                                ) : (
                                                    <>$ {item.price}</>
                                                )}
                                            </div>
                                        </div>

                                        {/* Item Image (Right) - matching reference image */}
                                        <div className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100">
                                            <img
                                                src={item.image || "/image_placeholder.png"}
                                                alt={item.name}
                                                className={`w-full h-full object-cover ${!item.image ? "invert opacity-50" : ""}`}
                                            />
                                            {/* Show Options button overlay if has variants */}
                                            {item.variants && item.variants.length > 0 && (
                                                <div className="absolute bottom-2 right-2">
                                                    <button className="text-xs font-semibold text-white bg-orange-600 rounded-full px-3 py-1.5 shadow-lg">
                                                        Show Options
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};
