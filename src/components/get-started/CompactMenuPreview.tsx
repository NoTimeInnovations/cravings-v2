"use client";

import React, { useState, useRef, useEffect } from "react";
import { MapPin, Search } from "lucide-react";
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
    currency?: string;
}

const formatDisplayName = (name: string): string => {
    return name.split(/[_-]/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

export const CompactMenuPreview: React.FC<CompactMenuPreviewProps> = ({
    items,
    hotelDetails,
    colorPalette = { text: "#000000", background: "#ffffff", accent: "#ea580c" },
    currency = "$",
}) => {
    const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
    const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
    const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set());

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
        const containerRect = container.getBoundingClientRect();
        const headerOffset = 130;

        let currentActive = activeCatIndex;

        for (let i = 0; i < categories.length; i++) {
            const section = categoryRefs.current[i];
            if (!section) continue;

            const sectionRect = section.getBoundingClientRect();

            if (sectionRect.top <= containerRect.top + headerOffset &&
                sectionRect.bottom > containerRect.top + headerOffset) {
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
        const container = scrollContainerRef.current;

        if (section && container) {
            const sectionRect = section.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const currentScroll = container.scrollTop;

            const scrollTarget = currentScroll + (sectionRect.top - containerRect.top) - 80;

            container.scrollTo({
                top: scrollTarget,
                behavior: 'smooth'
            });
        }
    };

    const toggleVariants = (globalIndex: number) => {
        setExpandedVariants(prev => {
            const next = new Set(prev);
            if (next.has(globalIndex)) {
                next.delete(globalIndex);
            } else {
                next.add(globalIndex);
            }
            return next;
        });
    };

    let globalItemIndex = 0;

    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="w-full overflow-x-hidden md:max-w-md md:mx-auto md:shadow-xl md:rounded-3xl overflow-y-auto scrollbar-hide md:border border-gray-200 h-[calc(100vh-10rem)] md:h-[600px] relative transition-colors duration-300 max-w-[100vw]"
            style={{ backgroundColor: colorPalette.background, color: colorPalette.text }}
        >
            {/* Header / Banner */}
            <div className="relative">
                <div className="w-full h-48 relative overflow-hidden bg-gray-100">
                    {hotelDetails.banner ? (
                        <img
                            src={hotelDetails.banner}
                            alt={hotelDetails.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
                            style={{ backgroundColor: colorPalette.accent }}>
                            <div className="absolute inset-0 opacity-10"
                                style={{
                                    backgroundImage: "radial-gradient(#fff 2px, transparent 2px)",
                                    backgroundSize: "20px 20px"
                                }}
                            ></div>
                        </div>
                    )}

                    {/* Center Overlay - Handwriting Font */}
                    {!hotelDetails.banner && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-4">
                            <h1
                                className={`font-handwriting text-white drop-shadow-md text-center font-bold break-words w-full ${(hotelDetails.name?.length || 0) > 35
                                    ? "text-2xl"
                                    : (hotelDetails.name?.length || 0) > 25
                                        ? "text-3xl"
                                        : (hotelDetails.name?.length || 0) > 15
                                            ? "text-4xl"
                                            : "text-5xl"
                                    }`}
                            >
                                {hotelDetails.name}
                            </h1>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
            </div>

            {/* Hotel details (Below Banner) */}
            <div className="flex flex-col gap-2 p-5 pb-2 items-start justify-center">
                <h1 className="text-xl font-semibold">
                    {hotelDetails.name}
                </h1>
                {hotelDetails.country && (
                    <div className="inline-flex gap-2 text-sm opacity-80">
                        <MapPin size={15} />
                        <span>{hotelDetails.country}</span>
                    </div>
                )}
            </div>

            {/* Links */}
            <div className="p-4 sm:mt-4 flex items-center gap-2 max-w-full overflow-hidden">
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
                            backgroundColor: `${colorPalette.text}0D`,
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
                        className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1 transition-colors"
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
                        className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1 flex items-center gap-1 transition-colors"
                        style={{
                            backgroundColor: vegFilter === "veg" ? "#22c55e" : "transparent",
                            color: vegFilter === "veg" ? "#ffffff" : colorPalette.text,
                            borderColor: vegFilter === "veg" ? "#22c55e" : `${colorPalette.text}30`
                        }}
                    >
                        <div className={`w-2.5 h-2.5 border-[1.5px] flex items-center justify-center`} style={{ borderColor: vegFilter === "veg" ? "#ffffff" : "#22c55e" }}>
                            <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: vegFilter === "veg" ? "#ffffff" : "#22c55e" }}></div>
                        </div>
                        Veg
                    </button>
                    <button
                        onClick={() => setVegFilter("non-veg")}
                        className="border font-semibold text-xs text-nowrap rounded-full px-3 py-1 flex items-center gap-1 transition-colors"
                        style={{
                            backgroundColor: vegFilter === "non-veg" ? "#ef4444" : "transparent",
                            color: vegFilter === "non-veg" ? "#ffffff" : colorPalette.text,
                            borderColor: vegFilter === "non-veg" ? "#ef4444" : `${colorPalette.text}30`
                        }}
                    >
                        <div className={`w-2.5 h-2.5 border-[1.5px] flex items-center justify-center`} style={{ borderColor: vegFilter === "non-veg" ? "#ffffff" : "#ef4444" }}>
                            <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: vegFilter === "non-veg" ? "#ffffff" : "#ef4444" }}></div>
                        </div>
                        Non-Veg
                    </button>
                </div>
            )}

            {/* Categories Navigation - Sticky */}
            <div className="sticky top-0 z-10">
                <div
                    className="overflow-x-scroll w-full flex gap-2 p-2 shadow-md scrollbar-hide border-[1px] relative transition-colors duration-300"
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
                            className={`p-3 text-nowrap cursor-pointer flex-shrink-0 transition-colors ${activeCatIndex === index ? "font-semibold" : "font-medium"}`}
                            style={{
                                color: activeCatIndex === index ? colorPalette.accent : colorPalette.text,
                                opacity: activeCatIndex === index ? 1 : 0.7
                            }}
                        >
                            {formatDisplayName(category)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Menu Content */}
            <div className="grid gap-4 p-4 pb-24 relative">
                {Object.entries(groupedItems).map(([category, categoryItems], index) => {
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
                            <h2
                                className="text-xl font-bold sticky top-[64px] z-[9] py-4"
                                style={{ color: colorPalette.accent, backgroundColor: colorPalette.background }}
                            >
                                {formatDisplayName(category)}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 divide-y-2 divide-gray-200">
                                {filteredItems.map((item) => {
                                    const currentIndex = globalItemIndex++;
                                    const hasVariants = item.variants && item.variants.length > 0;
                                    const isExpanded = expandedVariants.has(currentIndex);
                                    const basePrice = hasVariants
                                        ? [...item.variants!].sort((a, b) => a.price - b.price)[0].price
                                        : item.price;

                                    return (
                                        <React.Fragment key={currentIndex}>
                                            <div className="p-4 flex justify-between relative">
                                                {/* Item Details (Left) */}
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        {/* Veg/Non-Veg Indicator */}
                                                        {item.is_veg !== null && item.is_veg !== undefined && (
                                                            <div className="flex-shrink-0">
                                                                {item.is_veg === false ? (
                                                                    <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center">
                                                                        <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center">
                                                                        <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <h3 className="capitalize text-lg font-semibold" style={{ color: colorPalette.text }}>
                                                            {item.name}
                                                        </h3>
                                                    </div>

                                                    <p className="text-sm opacity-50">
                                                        {item.description}
                                                    </p>

                                                    {/* Price */}
                                                    <div className="text-lg font-bold mt-1" style={{ color: colorPalette.accent }}>
                                                        {basePrice > 0 ? (
                                                            <>
                                                                {hasVariants && <span className="text-sm">From </span>}
                                                                {currency} {basePrice}
                                                            </>
                                                        ) : ""}
                                                    </div>
                                                </div>

                                                {/* Item Image (Right) */}
                                                <div className="relative">
                                                    <div className="overflow-hidden aspect-square h-28 rounded-3xl relative">
                                                        <img
                                                            src={item.image || "/image_placeholder.png"}
                                                            alt={item.name}
                                                            className={`w-full h-full object-cover ${!item.image ? "invert opacity-50" : ""}`}
                                                        />
                                                    </div>
                                                    {/* Show Options button */}
                                                    {hasVariants && (
                                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                                                            <div
                                                                onClick={() => toggleVariants(currentIndex)}
                                                                style={{ backgroundColor: colorPalette.accent, color: "white" }}
                                                                className="rounded-full px-4 py-1 font-medium text-sm whitespace-nowrap h-fit cursor-pointer"
                                                            >
                                                                {isExpanded ? "Hide Options" : "Show Options"}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Variant List */}
                                            {isExpanded && hasVariants && (
                                                <div className="w-full mt-2 divide-y divide-gray-200/30 border-t border-gray-200/30">
                                                    {item.variants!.map((variant) => (
                                                        <div
                                                            key={variant.name}
                                                            className="py-2 px-4 rounded-lg flex justify-between items-center gap-5 w-full"
                                                        >
                                                            <span className="font-semibold">{variant.name}</span>
                                                            <div
                                                                className="text-lg font-bold"
                                                                style={{ color: colorPalette.accent }}
                                                            >
                                                                {variant.price > 0
                                                                    ? `${currency} ${variant.price}`
                                                                    : ""}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};
