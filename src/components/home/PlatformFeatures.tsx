"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
    ScanLine,
    Globe,
    Monitor,
    Smartphone,
    ClipboardList,
    Boxes,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Store,
    Flame,
    Percent,
    Utensils,
    Power,
    Star
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const PRODUCTS = [
    {
        title: "Smart QR Menu",
        description: "Customers scan and instantly view your menu on their phone — no app needed.",
        icon: ScanLine,
        href: "#",
        image: "/digital_menu_preview.png"
    },
    {
        title: "Live Menu Updates",
        description: "Change prices, items, or availability in real time. Updates reflect instantly.",
        icon: Power,
        href: "#",
        image: "/live-update.png"
    },
    {
        title: "Dynamic Offers",
        description: "Show special deals, happy-hour menus, or time-based discounts automatically.",
        icon: Percent,
        href: "#",
        image: "/delivery_website.png"
    },
    {
        title: "Highlight Famous Dishes",
        description: "Auto-tag bestsellers and chef’s specials to guide customer choices.",
        icon: Flame,
        href: "#",
        image: "/preview-captain-ordering.png"
    },
    {
        title: "Easy Menu Management",
        description: "Add, edit, or remove items in seconds from a simple dashboard.",
        icon: ClipboardList,
        href: "#",
        image: "/inventory-preview-5.png"
    },
    {
        title: "Google Reviews Booster",
        description: "One-tap review request after menu scan to grow your 5⭐ ratings.",
        icon: Star,
        href: "#",
        image: "/table-ordering.png"
    }
];

export default function PlatformFeatures() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400; // Adjust scroll amount as needed
            scrollContainerRef.current.scrollBy({
                left: direction === "right" ? scrollAmount : -scrollAmount,
                behavior: "smooth"
            });
        }
    };

    return (
        <section className="py-24 relative overflow-hidden">

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="max-w-4xl flex flex-col items-center text-center md:items-start md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-xs font-bold tracking-wider text-gray-500 mb-4 md:mb-8 uppercase">
                            <Store className="w-4 h-4" />
                            Our Platform
                        </div>
                        <h2 className="text-3xl md:text-5xl font-medium text-gray-900 leading-[1.1] tracking-tight">
                            Streamline your restaurant with <br />
                            <span className="text-[#e55a23]">one platform</span>
                        </h2>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="hidden md:flex gap-4">
                        <button
                            onClick={() => scroll("left")}
                            className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors bg-white z-10"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scroll("right")}
                            className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors bg-white z-10"
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Cards Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto py-10 -mx-6 px-6 lg:-mr-8 lg:px-8 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {PRODUCTS.map((product, index) => (
                        <div
                            key={index}
                            className="min-w-[calc(80vw-3rem)] md:min-w-[340px] bg-[#F6F6F6] rounded-2xl p-6 flex flex-col snap-center group hover:shadow-[0px_0px_30px_rgba(0,0,0,0.12)] transition-all duration-300 border border-transparent cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <product.icon className="w-6 h-6 text-[#e55a23]" />
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {product.title}
                                    </h3>
                                </div>
                                <Link
                                    href={product.href}
                                    className="text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            <p className="text-sm text-gray-600 leading-relaxed mb-6 min-h-[40px]">
                                {product.description}
                            </p>

                            <div className="relative mt-auto -mx-6 -mb-6 h-52 w-[calc(100%+3rem)] rounded-b-2xl overflow-hidden">
                                <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    className="object-contain mix-blend-multiply"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
