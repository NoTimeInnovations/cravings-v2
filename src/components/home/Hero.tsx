"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { UtensilsCrossed, QrCode, Smartphone, Zap, ArrowRight } from "lucide-react";
import Image from "next/image";

// Restaurant logos from Marquee
const trustedRestaurants = [
    "/logos/chicking.png",
    "/logos/proyal.png",
    "/logos/malabar.jpg",
    "/logos/chillies.webp"
];

export default function Hero() {
    const [animationStep, setAnimationStep] = useState(0);

    useEffect(() => {
        // Run animation sequence once
        const timer1 = setTimeout(() => setAnimationStep(1), 1500); // Start scanning after 1.5s
        const timer2 = setTimeout(() => setAnimationStep(2), 3500); // Show menu after 3.5s

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <div className="relative pt-32 pb-12 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-br from-[#C04812] to-[#82290A]">
            {/* Background Texture/Gradient Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]" />

            <div className="max-w-10xl mx-auto p-6 lg:px-20 lg:pr-36 flex flex-col lg:flex-row items-center gap-10 lg:gap-6 relative z-10">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                    <h1 className="text-4xl lg:text-5xl font-medium text-white leading-[1.1] tracking-[-0.03em] mb-6 max-w-2xl mx-auto lg:mx-0">
                        Cravings is built to adapt <br className="hidden lg:block" /> food technology at its best
                    </h1>

                    <p className="text-[1rem] leading-[1.6] tracking-[-0.02px] text-white/90 mb-8 max-w-2xl mx-auto lg:mx-0 font-medium">
                        Thoughtfully designed tools that adapt to your restaurant—simple <br className="hidden lg:block" /> to use, easy to grow with, and always in your control.
                    </p>

                    <div className="flex flex-col items-center lg:items-start justify-center lg:justify-start gap-8 max-w-2xl mx-auto lg:mx-0">
                        <Link
                            href="/get-started"
                            className="px-8 py-4 bg-[#0a0b10] text-white text-lg font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-lg min-w-[200px] text-center"
                        >
                            Start with digital Menu
                        </Link>

                        <Link
                            target="_blank"
                            href="/hotels/LE-GRAND-CAFE/20f7e974-f19e-4c11-b6b7-4385f61f27bf"
                            className="flex items-center gap-2 text-white font-medium hover:opacity-80 transition-opacity text-lg group"
                        >
                            View Interactive demo
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>

                {/* Right Animation */}
                <div className="w-full lg:w-1/2 relative flex justify-center items-start lg:items-center mt-0 lg:mt-0">
                    <div className="relative w-full flex justify-center items-center z-20">
                        <Image
                            src="/hero-image.png"
                            alt="Cravings App Interface"
                            width={1400}
                            height={1600}
                            priority
                            className="
                            w-[110%] 
                            lg:w-[120%] 
                            max-w-[1200px] 
                            h-auto 
                            translate-x-4 
                            lg:translate-x-12
                            "
                        />
                    </div>

                </div>

            </div>

        </div>
    );
}
