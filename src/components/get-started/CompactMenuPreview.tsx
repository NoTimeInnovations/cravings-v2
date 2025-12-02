"use client";

import React, { useState, useRef, useEffect } from "react";
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

export interface ColorPalette {
    text: string;
    background: string;
    accent: string;
}

interface CompactMenuPreviewProps {
    items: MenuItem[];
    hotelDetails: HotelDetails;
    colorPalette?: ColorPalette;
}

export const CompactMenuPreview: React.FC<CompactMenuPreviewProps> = ({
    items,
    hotelDetails,
    colorPalette = { text: "#000000", background: "#ffffff", accent: "#ea580c" }, // Default to orange-600
}) => {
    const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const categoryRefs = useRef<(HTMLElement | null)[]>([]);
    const navRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [borderStyle, setBorderStyle] = useState({ left: 0, width: 0 });

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

    useEffect(() => {
        const activeNav = navRefs.current[activeCatIndex];
        if (activeNav) {
            setBorderStyle({
                left: activeNav.offsetLeft,
                width: activeNav.offsetWidth
            });
            activeNav.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeCatIndex, categories.length]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const scrollPosition = container.scrollTop;
        const offset = 20;

        let currentActive = activeCatIndex;

        for (let i = 0; i < categories.length; i++) {
            const section = categoryRefs.current[i];
            if (!section) continue;

            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollPosition >= sectionTop - offset && scrollPosition < sectionTop + sectionHeight - offset) {
                currentActive = i;
                break;
            }
        }

        if (currentActive !== activeCatIndex) {
            setActiveCatIndex(currentActive);
        }
    };

    const scrollToCategory = (index: number) => {
        setActiveCatIndex(index);
        const section = categoryRefs.current[index];
        if (section && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: section.offsetTop,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div
            className="w-full overflow-x-hidden md:max-w-md md:mx-auto md:shadow-xl md:rounded-3xl overflow-hidden md:border border-gray-200 min-h-[calc(100vh-4rem)] md:min-h-0 md:h-[600px] flex flex-col relative transition-colors duration-300 max-w-[100vw]"
            style={{ backgroundColor: colorPalette.background, color: colorPalette.text }}
        >
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
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: `${colorPalette.accent}20`, color: colorPalette.accent }}
                        >
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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={20} style={{ color: colorPalette.text }} />
                    <input
                        type="text"
                        placeholder="Search for dishes..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                        style={{
                            backgroundColor: `${colorPalette.text}0D`, // 5% opacity of text color
                            color: colorPalette.text,
                            borderColor: `${colorPalette.text}20`
                        }}
                        disabled
                    />
                </div>
            </div>

            {/* Veg/Non-Veg Filter */}
            {hasVegFilter && (
                <div className="px-4 flex gap-2 flex-wrap pb-2">
                    <button
                        onClick={() => setVegFilter("all")}
                        className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1.5 transition-colors"
                        style={{
                            backgroundColor: vegFilter === "all" ? colorPalette.accent : "transparent",
                            color: vegFilter === "all" ? "#ffffff" : colorPalette.text,
                            borderColor: vegFilter === "all" ? colorPalette.accent : `${colorPalette.text}30`
                        }}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setVegFilter("veg")}
                        className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                        style={{
                            backgroundColor: vegFilter === "veg" ? "#16a34a" : "transparent",
                            color: vegFilter === "veg" ? "#ffffff" : colorPalette.text,
                            borderColor: vegFilter === "veg" ? "#16a34a" : `${colorPalette.text}30`
                        }}
                    >
                        <div className={`w-2.5 h-2.5 border-[1.5px] flex items-center justify-center`} style={{ borderColor: vegFilter === "veg" ? "#ffffff" : "#16a34a" }}>
                            <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: vegFilter === "veg" ? "#ffffff" : "#16a34a" }}></div>
                        </div>
                        Veg
                    </button>
                    <button
                        onClick={() => setVegFilter("non-veg")}
                        className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                        style={{
                            backgroundColor: vegFilter === "non-veg" ? "#dc2626" : "transparent",
                            color: vegFilter === "non-veg" ? "#ffffff" : colorPalette.text,
                            borderColor: vegFilter === "non-veg" ? "#dc2626" : `${colorPalette.text}30`
                        }}
                    >
                        <div className={`w-2.5 h-2.5 border-[1.5px] flex items-center justify-center`} style={{ borderColor: vegFilter === "non-veg" ? "#ffffff" : "#dc2626" }}>
                            <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: vegFilter === "non-veg" ? "#ffffff" : "#dc2626" }}></div>
                        </div>
                        Non-Veg
                    </button>
                </div>
            )}

            {/* Categories Navigation - Sticky */}
            <div className="sticky top-0 z-10">
                <div
                className="overflow-x-scroll w-full flex gap-2 p-2 shadow-md scrollbar-hide border-b relative transition-colors duration-300"
                style={{
                    backgroundColor: colorPalette.background,
                    borderColor: `${colorPalette.text}10`
                }}
            >
                {/* Animated border element */}
                <div
                    className="absolute bottom-0 h-0.5 transition-all duration-300 ease-in-out"
                    style={{
                        left: `${borderStyle.left}px`,
                        width: `${borderStyle.width}px`,
                        backgroundColor: colorPalette.accent
                    }}
                />

                {categories.map((category, index) => (
                    <div
                        key={category}
                        ref={(el) => { navRefs.current[index] = el; }}
                        onClick={() => scrollToCategory(index)}
                        className="p-3 text-nowrap cursor-pointer flex-shrink-0 transition-colors"
                        style={{
                            color: activeCatIndex === index ? colorPalette.accent : colorPalette.text,
                            fontWeight: activeCatIndex === index ? 600 : 500,
                            opacity: activeCatIndex === index ? 1 : 0.7
                        }}
                    >
                        {category}
                    </div>
                ))}
            </div>
            </div>

            {/* Menu Content - matching Compact.tsx grid structure */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="grid gap-4 p-4 pb-24 overflow-y-auto scrollbar-hide max-h-[500px] md:max-h-none md:flex-1 relative"
            >
                {Object.entries(groupedItems).map(([category, categoryItems], index) => {
                    // Filter items based on veg filter
                    const filteredItems = categoryItems.filter(item => {
                        if (vegFilter === "all" || !hasVegFilter) return true;
                        if (vegFilter === "veg") return item.is_veg === true;
                        if (vegFilter === "non-veg") return item.is_veg === false;
                        return true;
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                        <section
                            key={category}
                            ref={(el) => { categoryRefs.current[index] = el; }}
                            className="py-4"
                        >
                            <h2 className="text-xl font-bold py-4" style={{ color: colorPalette.accent }}>
                                {category}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 divide-y-2" style={{ borderColor: `${colorPalette.text}10` }}>
                                {filteredItems.map((item, index) => (
                                    <div key={index} className="p-4 flex gap-3 relative" style={{ borderColor: `${colorPalette.text}10` }}>
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
                                                <h3 className="font-semibold text-base" style={{ color: colorPalette.text }}>
                                                    {item.name}
                                                </h3>
                                            </div>

                                            <p className="text-sm mt-1 line-clamp-2" style={{ color: colorPalette.text, opacity: 0.6 }}>
                                                {item.description}
                                            </p>

                                            {/* Price on bottom left */}
                                            <div className="mt-3 text-lg font-semibold" style={{ color: colorPalette.accent }}>
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
                                                    <button
                                                        className="text-xs font-semibold text-white rounded-full px-3 py-1.5 shadow-lg"
                                                        style={{ backgroundColor: colorPalette.accent }}
                                                    >
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
