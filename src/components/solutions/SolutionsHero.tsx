"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";


interface HeroData {
    eyebrow?: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    primaryCtaLink?: string;
    secondaryCta?: string;
    secondaryCtaLink?: string;
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
                        <Link href={data.primaryCtaLink || "#"} className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-all shadow-sm">
                            {data.primaryCta}
                        </Link>
                        {data.secondaryCta && (
                            <Link href={data.secondaryCtaLink || "#"} className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                                {data.secondaryCta}
                            </Link>
                        )}
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
