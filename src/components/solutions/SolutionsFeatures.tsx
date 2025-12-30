"use client";

import React from "react";
import Image from "next/image";
import { Check } from "lucide-react";

interface Feature {
    title: string;
    description: string;
    list: string[];
    image: string;
    imagePosition?: "left" | "right";
}

interface SolutionsFeaturesProps {
    features: Feature[];
}

export function SolutionsFeatures({ features }: SolutionsFeaturesProps) {
    if (!features) return null;

    return (
        <section className="py-24 bg-white space-y-32">
            {features.map((feature, index) => {
                // Default Zig-Zag: 0 = Image Right, 1 = Image Left, etc.
                // Unless specifically overridden by imagePosition
                const isImageRight = feature.imagePosition
                    ? feature.imagePosition === "right"
                    : index % 2 === 0;

                return (
                    <div key={index} className="container mx-auto px-4 md:px-6">
                        <div className={`flex flex-col lg:flex-row items-center gap-16 lg:gap-24 ${!isImageRight ? "lg:flex-row-reverse" : ""}`}>

                            {/* Text Content Block */}
                            <div className="flex-1 space-y-6">
                                <h2 className="text-3xl lg:text-4xl font-medium text-gray-900 leading-tight tracking-tight">
                                    {feature.title}
                                </h2>
                                <p className="text-lg text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>

                                <ul className="pt-4 space-y-4">
                                    {feature.list.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-1">
                                                <Check className="w-3 h-3 text-orange-600" strokeWidth={3} />
                                            </div>
                                            <span className="text-gray-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pt-6">
                                    <button className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                                        Learn more
                                    </button>
                                </div>
                            </div>

                            {/* Visual Block */}
                            <div className="flex-1 w-full">
                                <div className={`relative bg-[#F3F4F6] rounded-2xl p-8 lg:p-12 aspect-[4/3] flex items-center justify-center border border-gray-100/50 shadow-sm ${!isImageRight ? "bg-[#FFFBF5]" : "bg-[#F3F4F6]"}`}>
                                    {/* Placeholder Mockup Container */}
                                    <div className="relative w-full h-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                        {/* If there's a real image, use it */}
                                        {feature.image && (
                                            <Image
                                                src={feature.image}
                                                alt={feature.title}
                                                fill
                                                className="object-cover"
                                            />
                                        )}

                                        {/* Fallback pattern if no image */}
                                        {!feature.image && (
                                            <div className="absolute inset-0 bg-gray-50 flex flex-col p-6 animate-pulse">
                                                <div className="h-4 w-1/3 bg-gray-200 rounded mb-4" />
                                                <div className="h-32 w-full bg-gray-100 rounded mb-4" />
                                                <div className="flex gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-2 w-full bg-gray-200 rounded" />
                                                        <div className="h-2 w-2/3 bg-gray-200 rounded" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Decorative floating badges matching design vibe */}
                                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-3 border border-gray-100 hidden md:block">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                                <span className="text-orange-600 text-xs font-bold">$$</span>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-900">Savings</div>
                                                <div className="text-[10px] text-gray-500">+25% vs last month</div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </div>
                );
            })}
        </section>
    );
}
