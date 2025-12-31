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

interface FeaturesProps {
    features: Feature[];
}

export function FeatureSection({ features }: FeaturesProps) {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="space-y-24 md:space-y-32">
                    {features.map((feature, index) => {
                        const isRightAligned = feature.imagePosition === "right" || (!feature.imagePosition && index % 2 === 0);

                        return (
                            <div key={index} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${!isRightAligned ? "lg:flex-row-reverse" : ""}`}>
                                {/* Text Content */}
                                <div className="flex-1 space-y-8">
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                                        {feature.title}
                                    </h2>
                                    <p className="text-lg text-gray-600 leading-relaxed">
                                        {feature.description}
                                    </p>

                                    <ul className="space-y-4">
                                        {feature.list.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                                                    <Check className="w-3.5 h-3.5 text-orange-600" strokeWidth={3} />
                                                </div>
                                                <span className="text-gray-700 font-medium">{item}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button className="text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center group">
                                        Learn more
                                        <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Image / Visual */}
                                <div className="flex-1 w-full">
                                    <div className={`relative rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 aspect-square md:aspect-[4/3] shadow-lg ${!isRightAligned ? "bg-orange-50/50" : "bg-blue-50/50"}`}>
                                        <Image
                                            src={feature.image}
                                            alt={feature.title}
                                            fill
                                            className="object-cover object-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
