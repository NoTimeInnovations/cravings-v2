"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

interface Review {
    author: string;
    role: string;
    company: string;
    text: string;
    avatar?: string;
}

interface ClientReviewsSectionProps {
    reviews: Review[];
}

export function ClientReviewsSection({ reviews }: ClientReviewsSectionProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    const onInit = useCallback((emblaApi: any) => {
        setScrollSnaps(emblaApi.scrollSnapList());
    }, []);

    const onSelect = useCallback((emblaApi: any) => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, []);

    useEffect(() => {
        if (!emblaApi) return;

        onInit(emblaApi);
        onSelect(emblaApi);
        emblaApi.on("reInit", onInit);
        emblaApi.on("reInit", onSelect);
        emblaApi.on("select", onSelect);
    }, [emblaApi, onInit, onSelect]);

    const scrollTo = useCallback(
        (index: number) => emblaApi && emblaApi.scrollTo(index),
        [emblaApi]
    );

    return (
        <section className="py-10 bg-[#F5F5F0] relative overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 relative z-10">

                <div className="relative max-w-4xl mx-auto">
                    {/* Carousel Viewport */}
                    <div className="overflow-hidden" ref={emblaRef}>
                        <div className="flex">
                            {reviews.map((review, index) => (
                                <div key={index} className="flex-[0_0_100%] min-w-0">
                                    <div className="flex flex-col items-center text-center px-4 md:px-12 py-8">

                                        {/* Avatar / Logo Area */}
                                        <div className="mb-8 relative">
                                            <div className="w-24 h-16 relative flex items-center justify-center bg-white rounded-lg shadow-sm px-4 py-2">
                                                {/* Using placeholder logic similar to reference 'Logo' style */}
                                                {review.avatar && !review.avatar.includes("avatar-") ? (
                                                    <Image src={review.avatar} alt={review.author} width={80} height={40} className="w-full h-full object-contain" />
                                                ) : (
                                                    // Text fallback that looks like a logo
                                                    <span className="font-bold text-gray-700 text-sm tracking-tight">{review.company}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quote Text */}
                                        <blockquote className="text-xl md:text-2xl lg:text-[1.75rem] text-gray-600 leading-relaxed mb-10 max-w-3xl font-normal">
                                            "{review.text}"
                                        </blockquote>

                                        {/* Author Info */}
                                        <div className="flex flex-col items-center">
                                            <div className="font-bold text-gray-900 text-lg mb-1">{review.author}</div>
                                            <div className="text-sm text-gray-500 font-medium">{review.role}, {review.company}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex justify-center gap-3 mt-8">
                        {scrollSnaps.map((_, index) => (
                            <button
                                key={index}
                                className={cn(
                                    "w-3 h-3 rounded-full transition-all duration-300",
                                    index === selectedIndex ? "bg-gray-800 scale-110" : "bg-gray-300 hover:bg-gray-400"
                                )}
                                onClick={() => scrollTo(index)}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
