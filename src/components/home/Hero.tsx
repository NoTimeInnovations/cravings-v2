"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UtensilsCrossed, QrCode, Smartphone, Zap } from "lucide-react";
import HeroButtons from "@/components/international/HeroButtons";
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
        <div className="relative pt-12 pb-12 lg:pt-32 lg:pb-24 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left z-10">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                        <span className="p-2 bg-orange-100 rounded-lg">
                            <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                        </span>
                        <span className="text-sm font-bold text-orange-600 tracking-wide uppercase">
                            The #1 Digital Menu Platform
                        </span>
                    </div>

                    <h1 className="text-4xl lg:text-7xl font-semibold text-gray-900 leading-[1.1] mb-6 tracking-tight">
                        The Ultimate <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
                            Digital Menu Creator
                        </span>
                    </h1>

                    <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        Create a stunning digital menu in seconds. No apps to download.
                        Just a simple QR code that opens a world of flavors.
                    </p>

                    <div className="flex flex-col items-center lg:items-start gap-4">
                        <HeroButtons />
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
                            <div className="flex -space-x-3">
                                {trustedRestaurants.map((logo, i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                        <Image src={logo} width={40} height={40} alt="Restaurant" className="w-full h-full object-contain p-1" />
                                    </div>
                                ))}
                            </div>
                            <p>Trusted by <span className="font-bold text-gray-900">400+</span> restaurants</p>
                        </div>
                    </div>
                </div>

                {/* Right Animation */}
                <div className="flex-1 relative flex justify-center items-center w-full max-w-xl lg:max-w-none h-[500px] lg:min-h-[600px] mt-8 lg:mt-0">
                    {/* Animated Background Blob */}
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-tr from-orange-200/30 to-rose-200/30 rounded-full blur-3xl -z-10"
                    />

                    <div className="relative w-[300px] h-[520px] lg:w-[360px] lg:h-[600px]">
                        {/* Phone Frame */}
                        <div className="absolute inset-0 border-gray-800 bg-gray-900 border-[8px] lg:border-[12px] rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl z-20 overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 lg:w-32 lg:h-6 bg-gray-900 rounded-b-xl z-30"></div>

                            <div className="w-full h-full bg-white relative">
                                {/* Iframe Layer - Always loaded in background */}
                                <div className="absolute inset-0 bg-white overflow-hidden z-0">
                                    <iframe
                                        src="https://www.cravings.live/hotels/LE-GRAND-CAFE/20f7e974-f19e-4c11-b6b7-4385f61f27bf"
                                        className="w-[calc(100%+17px)] h-[calc(100%+17px)] border-none -ml-[1px] -mt-[1px]"
                                        title="Demo Menu"
                                    />
                                </div>

                                {/* Overlay Scanning Animation */}
                                <AnimatePresence>
                                    {animationStep === 0 && (
                                        <motion.div
                                            key="scan"
                                            initial={{ opacity: 1 }}
                                            exit={{ opacity: 0, transition: { duration: 0.5 } }}
                                            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 z-10"
                                        >
                                            <motion.div
                                                animate={{ y: [-150, 150, -150] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                className="absolute top-1/2 left-0 right-0 h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] z-10"
                                            />
                                            <QrCode className="w-24 h-24 lg:w-32 lg:h-32 mb-8 text-white/80" />
                                            <p className="text-lg font-medium">Scanning QR Code...</p>
                                        </motion.div>
                                    )}

                                    {animationStep === 1 && (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center bg-orange-50 z-10"
                                        >
                                            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                                            <p className="text-orange-800 font-medium">Loading Menu...</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute top-20 -right-4 bg-white p-4 rounded-xl shadow-lg z-30 flex items-center gap-3"
                    >
                        <div className="p-2 bg-green-100 rounded-full">
                            <Zap className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold">Speed</p>
                            <p className="text-sm font-bold text-gray-900">Instant Load</p>
                        </div>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-32 -left-10 bg-white p-4 rounded-xl shadow-lg z-30 flex items-center gap-3"
                    >
                        <div className="p-2 bg-blue-100 rounded-full">
                            <Smartphone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold">Access</p>
                            <p className="text-sm font-bold text-gray-900">No App Needed</p>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
