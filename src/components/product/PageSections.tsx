"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FAQItem {
    question: string;
    answer: string;
}

export function FAQSection({ items }: { items: FAQItem[] }) {
    return (
        <section className="py-24 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
                    Frequently asked questions
                </h2>

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:border-orange-200 transition-colors">
                            <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                                <span className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                                    {item.question}
                                </span>
                                <span className="ml-4 flex-shrink-0">
                                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
                                </span>
                            </summary>
                            <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                                <p>{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

interface CTAProps {
    data: {
        title: string;
        description: string;
        buttonText: string;
        buttonLink?: string;
        secondaryButtonText?: string;
        secondaryButtonLink?: string;
    };
}

import { ArrowRight, HelpCircle } from "lucide-react";

export function CTASection({ data }: CTAProps) {
    return (
        <section className="py-24 relative overflow-hidden bg-gradient-to-br from-[#fff7ed] to-[#f3f4f6]">
            {/* Background decoration matching product/HeroSection.tsx */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Left Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 mb-8">
                            <HelpCircle className="w-4 h-4" />
                            GET STARTED
                        </div>

                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-[-0.03em] text-gray-900 mb-6 leading-[1.1]">
                            {data.title}
                        </h2>

                        <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Streamline your restaurant operations and save on your spend and transfers today.
                            {/* Using hardcoded text to match the 'card' style if data.description is too short, 
                                but better to use data.description if it fits. Let's append or use data.description. */}
                            <br className="hidden lg:block" />
                            {data.description}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Button size="lg" asChild className="bg-[#0a0b10] hover:bg-gray-900 text-white h-12 px-8 rounded-lg text-base font-medium shadow-lg w-full sm:w-auto">
                                <Link href={data.buttonLink || "/get-started"}>
                                    {data.buttonText}
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild className="h-12 px-8 rounded-lg text-base font-medium border-gray-200 text-gray-900 hover:bg-gray-50 w-full sm:w-auto">
                                <Link href={data.secondaryButtonLink || "https://cal.id/menuthere"}>
                                    {data.secondaryButtonText || "Book Demo"}
                                </Link>
                            </Button>
                        </div>

                        <div className="mt-8 flex items-center justify-center lg:justify-start gap-2 text-sm text-gray-500">
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            No personal credit check or guarantee.
                        </div>
                    </div>

                    {/* Right Image Mockup */}
                    <div className="flex-1 relative w-full flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-[600px]">
                            {/* Using the same image as root page */}
                            <img
                                src="/hero-image.png"
                                alt="Dashboard Mockup"
                                width={1200}
                                height={1200}
                                className="w-full h-auto drop-shadow-2xl"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
