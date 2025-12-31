"use client";

import React from "react";
import Link from "next/link"; // Changed from 'lucide-react' based on previous file, wait, Button/Link usage.
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
    data: {
        eyebrow: string;
        headline: string;
        subheadline: string;
        primaryCta: string;
        secondaryCta: string;
        primaryCtaLink?: string;
        secondaryCtaLink?: string;
        image: string;
        video?: string;
    };
}

export function HeroSection({ data }: HeroProps) {
    const getEmbedUrl = (url: string) => {
        if (!url) return "";
        let videoId = "";
        const cleanUrl = url.trim();

        // Regex patterns for different YouTube URL formats
        const patterns = [
            /(?:youtu\.be\/)([^?&]+)/,
            /[?&]v=([^&]+)/,
            /(?:embed\/)([^?&]+)/,
            /(?:shorts\/)([^?&]+)/
        ];

        try {
            for (const pattern of patterns) {
                const match = cleanUrl.match(pattern);
                if (match && match[1]) {
                    videoId = match[1];
                    break;
                }
            }
        } catch (e) {
            console.error("Error parsing video URL:", e);
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?rel=0&loop=1&playlist=${videoId}&modestbranding=1&controls=0&showinfo=0&iv_load_policy=3`;
        }

        return cleanUrl;
    };

    return (
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-gradient-to-br from-[#fff7ed] to-[#f3f4f6]">
            {/* Background decoration matching home/Hero.tsx - updated opacity for light mode */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-900/5 text-gray-900 text-sm font-medium mb-6 border border-gray-900/10 backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-orange-600 mr-2"></span>
                        {data.eyebrow}
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-6xl font-medium tracking-[-0.03em] text-gray-900 mb-6 leading-[1.1]">
                        {data.headline}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-[1.2rem] text-gray-600 mb-8 max-w-2xl leading-[1.6] tracking-[-0.02px] font-normal">
                        {data.subheadline}
                    </p>

                    {/* CTA Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link href={data.primaryCtaLink || "/get-started"}>
                            <Button size="lg" className="bg-[#0a0b10] hover:bg-gray-800 text-white rounded-xl h-12 px-8 text-base shadow-lg border-0 w-full sm:w-auto">
                                {data.primaryCta}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href={data.secondaryCtaLink || "#"}>
                            <Button variant="outline" size="lg" className="rounded-xl h-12 px-8 text-base border-gray-200 text-gray-900 bg-white hover:bg-gray-50 w-full sm:w-auto">
                                <PlayCircle className="mr-2 h-4 w-4" />
                                {data.secondaryCta}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Hero Image / Video */}
                <div className="relative mx-auto max-w-5xl">
                    <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 aspect-[16/10] md:aspect-[2/1]">
                        {/* Fallback pattern if image is missing/placeholder */}
                        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                            {data.image.startsWith("/") ? (
                                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
                                    <span className="text-lg font-medium">Product Dashboard Preview</span>
                                </div>
                            ) : null}
                        </div>

                        {/* Mockup UI for Demo Purposes if no image */}
                        <div className="absolute inset-0 bg-white p-1 md:p-2">
                            {/* Inner Screen */}
                            <div className="h-full w-full bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative">
                                {/* Mock Browser Header */}
                                <div className="h-6 bg-white border-b flex items-center px-3 space-x-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                </div>
                                {/* Content area */}
                                {data.video ? (
                                    <div className="w-full h-full bg-black">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={getEmbedUrl(data.video)}
                                            title="Product Demo"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                ) : (
                                    <div className="p-8 flex items-center justify-center h-full">
                                        <p className="text-gray-400 italic">Dashboard Mockup: {data.headline}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Decorative backdrop glow */}
                    <div className="absolute -inset-4 bg-orange-500/10 blur-3xl -z-10 rounded-[3rem]" />
                </div>
            </div>
        </section>
    );
}
