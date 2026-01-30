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

export default function Hero({ appName = "Cravings" }: { appName?: string }) {
    const [animationStep, setAnimationStep] = useState(0);
    const [currentWord, setCurrentWord] = useState(0);
    const words = ["restaurant", "cafe", "QSR", "bistro"];

    // Layout Logic
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Carousel Logic
    const carouselImages = ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg"];
    const [carouselIndex, setCarouselIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentWord((prev) => (prev + 1) % words.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

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
        <div className="relative pt-24 pb-12 lg:pt-32 lg:pb-32 overflow-hidden bg-gradient-to-br from-[#C04812] to-[#82290A]">
            {/* Background Texture/Gradient Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)]" />

            <div className="max-w-10xl mx-auto p-6 lg:px-20 lg:pr-36 flex flex-col lg:flex-row items-center gap-10 lg:gap-6 relative z-10">
                {/* Left Content */}
                <div className="flex-1 text-center lg:text-left">
                    <h1 className="text-3xl lg:text-5xl font-medium text-white leading-[1.1] tracking-[-0.03em] mb-6 max-w-2xl mx-auto lg:mx-0">
                        Update your <br className="sm:hidden" /> <span className="inline-block align-top">
                            <AnimatePresence mode="popLayout">
                                <motion.span
                                    key={words[currentWord]}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="block text-orange-300 font-bold capitalize"
                                >
                                    {words[currentWord]}
                                </motion.span>
                            </AnimatePresence>
                        </span> <br className="hidden lg:block" /> menu in <br className="sm:hidden" />seconds
                    </h1>

                    <p className="text-[.8rem] sm:text-[1.2rem] leading-[1.6] tracking-[-0.02px] text-white/90 mb-8 max-w-xl mx-auto lg:mx-0 font-medium">
                        Change prices, run offers, and manage availability without reprinting menus.
                    </p>

                    <div className="flex flex-col items-center lg:items-start justify-center lg:justify-start gap-6 sm:gap-8 max-w-2xl mx-auto lg:mx-0 w-full sm:w-auto">
                        <Link
                            href="/get-started"
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-[#0a0b10] text-white text-base sm:text-lg font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-lg min-w-[200px] w-full sm:w-auto text-center"
                        >
                            Create Digital Menu For Free
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
                {/* Right Animation - 5 Card Layout */}
                {/* Right Animation - 5 Card Layout */}
                <div className="w-full lg:w-1/2 relative flex justify-center items-center mt-12 lg:mt-0 h-[350px] lg:h-[700px] perspective-1000">

                    {/* Far Left Card */}
                    <motion.div
                        initial={{ opacity: 0, x: isMobile ? -50 : -100, y: 10, rotate: -12 }}
                        animate={{ opacity: 0.6, x: isMobile ? -120 : -280, y: isMobile ? 20 : 40, rotate: -12 }}
                        className="absolute w-[100px] h-[200px] lg:w-[240px] lg:h-[480px] bg-black rounded-[0.8rem] lg:rounded-[2rem] border-[2px] lg:border-[4px] border-slate-900 shadow-xl overflow-hidden z-0"
                    >
                        <div className="relative w-full h-full">
                            <Image src="/2.jpg" alt="Screen 2" fill className="object-cover opacity-80" sizes="(max-width: 768px) 100px, 240px" />
                        </div>
                    </motion.div>

                    {/* Near Left Card */}
                    <motion.div
                        initial={{ opacity: 0, x: isMobile ? -30 : -50, y: 5, rotate: -6 }}
                        animate={{ opacity: 0.8, x: isMobile ? -70 : -150, y: isMobile ? 10 : 20, rotate: -6 }}
                        className="absolute w-[120px] h-[240px] lg:w-[260px] lg:h-[520px] bg-black rounded-[1rem] lg:rounded-[2.2rem] border-[3px] lg:border-[6px] border-slate-900 shadow-xl overflow-hidden z-10"
                    >
                        <div className="relative w-full h-full">
                            <Image src="/3.jpg" alt="Screen 3" fill className="object-cover opacity-90" sizes="(max-width: 768px) 120px, 260px" />
                        </div>
                    </motion.div>

                    {/* Far Right Card */}
                    <motion.div
                        initial={{ opacity: 0, x: isMobile ? 50 : 100, y: 10, rotate: 12 }}
                        animate={{ opacity: 0.6, x: isMobile ? 120 : 280, y: isMobile ? 20 : 40, rotate: 12 }}
                        className="absolute w-[100px] h-[200px] lg:w-[240px] lg:h-[480px] bg-black rounded-[0.8rem] lg:rounded-[2rem] border-[2px] lg:border-[4px] border-slate-900 shadow-xl overflow-hidden z-0"
                    >
                        <div className="relative w-full h-full">
                            <Image src="/4.jpg" alt="Screen 4" fill className="object-cover opacity-80" sizes="(max-width: 768px) 100px, 240px" />
                        </div>
                    </motion.div>

                    {/* Near Right Card */}
                    <motion.div
                        initial={{ opacity: 0, x: isMobile ? 30 : 50, y: 5, rotate: 6 }}
                        animate={{ opacity: 0.8, x: isMobile ? 70 : 150, y: isMobile ? 10 : 20, rotate: 6 }}
                        className="absolute w-[120px] h-[240px] lg:w-[260px] lg:h-[520px] bg-black rounded-[1rem] lg:rounded-[2.2rem] border-[3px] lg:border-[6px] border-slate-900 shadow-xl overflow-hidden z-10"
                    >
                        <div className="relative w-full h-full">
                            <Image src="/5.jpg" alt="Screen 5" fill className="object-cover opacity-90" sizes="(max-width: 768px) 120px, 260px" />
                        </div>
                    </motion.div>

                    {/* Center Card (Main) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative w-[140px] h-[280px] lg:w-[320px] lg:h-[640px] bg-black rounded-[1.2rem] lg:rounded-[3rem] border-[4px] lg:border-[8px] border-slate-900 shadow-2xl overflow-hidden ring-2 lg:ring-4 ring-slate-900/40 z-20"
                    >
                        {/* Status Bar / Notch */}


                        {/* Carousel Container */}
                        <div className="relative w-full h-full bg-slate-100">
                            <AnimatePresence mode="popLayout">
                                <motion.div
                                    key={carouselIndex}
                                    initial={{ opacity: 0, x: 100 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        src={carouselImages[carouselIndex]}
                                        alt="App Screenshot"
                                        fill
                                        className="object-cover"
                                        priority
                                        sizes="(max-width: 768px) 140px, 320px"
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]"></div>
                        </div>
                    </motion.div>
                </div>

            </div>

        </div>
    );
}
