"use client";

import React from "react";
import { Check } from "lucide-react";

interface Benefit {
    title: string;
    description: string;
}

interface SolutionsBenefitsProps {
    benefits: Benefit[];
    eyebrow?: string;
}

export function SolutionsBenefits({ benefits, eyebrow = "How Menuthere helps you" }: SolutionsBenefitsProps) {
    if (!benefits || benefits.length === 0) return null;

    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <h2 className="text-3xl font-medium text-gray-900 mb-12 tracking-tight">
                    {eyebrow}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {benefits.map((benefit, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white font-bold text-sm">
                                {index + 1}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mt-2">
                                {benefit.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed text-[0.95rem]">
                                {benefit.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
