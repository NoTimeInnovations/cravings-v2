"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

interface HeroData {
    eyebrow?: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta?: string;
    image: string;
}

interface SolutionsHeroProps {
    data: HeroData;
}

export function SolutionsHero({ data }: SolutionsHeroProps) {
    return (
        <section className="relative w-full bg-white min-h-[80vh] lg:min-h-screen flex flex-col lg:flex-row overflow-hidden pt-24 lg:pt-32">
            {/* Left Content Half */}
            <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-20 py-20 lg:py-0 relative z-10">
                <div className="max-w-xl">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-medium text-gray-900 leading-[1.1] tracking-tight mb-8">
                        {data.headline}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed font-normal">
                        {data.subheadline}
                    </p>

                    <div className="flex flex-wrap gap-4 mb-16">
                        <Link href="#" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-all shadow-sm">
                            {data.primaryCta}
                        </Link>
                        {data.secondaryCta && (
                            <Link href="#" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                                {data.secondaryCta}
                            </Link>
                        )}
                    </div>

                    {/* Trust/Social Proof Section matching mockup */}
                    <div className="flex items-center gap-6">
                        {/* Avatars */}
                        <div className="flex -space-x-3">
                            <div className="w-10 h-10 rounded-full border-2 border-white relative overflow-hidden bg-gray-100">
                                <Image src="/assets/avatars/avatar-1.png" alt="User" width={40} height={40} className="object-cover" />
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-white relative overflow-hidden bg-gray-100">
                                <Image src="/assets/avatars/avatar-2.png" alt="User" width={40} height={40} className="object-cover" />
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-white relative overflow-hidden bg-gray-100">
                                <Image src="/assets/avatars/avatar-3.png" alt="User" width={40} height={40} className="object-cover" />
                            </div>
                        </div>

                        {/* Stars & Text */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />
                                ))}
                                <span className="text-sm font-bold text-gray-900 ml-1">4.8</span>
                            </div>
                            <div className="text-sm text-gray-500 font-medium">
                                trusted by <span className="text-gray-900">5,000+ businesses</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Image Half */}
            <div className="flex-1 relative min-h-[400px] lg:min-h-screen w-full bg-gray-100">
                {/* If image path is valid, use it */}
                {data.image ? (
                    <Image
                        src={data.image}
                        alt={data.headline}
                        fill
                        className="object-cover object-center"
                        priority
                    />
                ) : (
                    // Fallback gradient if no image
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
                )}
            </div>
        </section>
    );
}
