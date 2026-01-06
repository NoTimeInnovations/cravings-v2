"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import {
    QrCode,
    CreditCard,
    BarChart3,
    Users,
    Utensils,
    Smartphone,
    ChefHat,
    Receipt,
    ShoppingBag,
    Star,
    Flame,
    Percent,
    Store,
    Power
} from "lucide-react";
import Image from "next/image";

const FEATURES = [
    {
        title: "Must Try Items",
        description: "Highlight your best dishes",
        icon: Flame,
        x: -320,
        y: -220,
        mobileX: -90,
        mobileY: -130,
        delay: 0.1
    },
    {
        title: "Dynamic Offers",
        description: "Run offers in seconds",
        icon: Percent,
        x: 320,
        y: -220,
        mobileX: 90,
        mobileY: -130,
        delay: 0.2
    },
    {
        title: "Availability Control",
        description: "Toggle items on/off instantly",
        icon: Power,
        x: -400,
        y: 0,
        mobileX: -110,
        mobileY: 0,
        delay: 0.3
    },
    {
        title: "Google Reviews",
        description: "Boost your ratings",
        icon: Star,
        x: 400,
        y: 0,
        mobileX: 110,
        mobileY: 0,
        delay: 0.4
    },
    {
        title: "QR Ordering",
        description: "Contactless & fast",
        icon: QrCode,
        x: -320,
        y: 220,
        mobileX: -90,
        mobileY: 130,
        delay: 0.5
    },
    {
        title: "Showcase Your Brand",
        description: "Custom colors & themes",
        icon: Store,
        x: 320,
        y: 220,
        mobileX: 90,
        mobileY: 130,
        delay: 0.6
    }
];

export default function AnimatedFeatures() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Smooth out the scroll progress for buttery animations
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 40,
        damping: 15,
        restDelta: 0.001
    });

    // Phone scale animation
    const phoneScale = useTransform(smoothProgress, [0, 0.5], [0.7, 1]);
    const phoneOpacity = useTransform(smoothProgress, [0, 0.2], [0.5, 1]);

    return (
        <section ref={containerRef} className="h-[150vh] relative">
            <div className="sticky top-0 h-screen flex flex-col items-center justify-start md:justify-center pt-16 md:pt-0 overflow-hidden">

                {/* Section Header */}
                <motion.div
                    className="relative z-20 text-center px-6 mb-8 md:mb-8"
                    style={{ opacity: useTransform(smoothProgress, [0, 0.2], [1, 0]) }}
                >
                    <h2 className="text-2xl md:text-5xl font-medium text-gray-900 mb-2 md:mb-5 leading-tight">
                        Everything revolves around <br />
                        <span className="text-[#C04812]">your specialized needs</span>
                    </h2>
                </motion.div>

                {/* Central Phone Mockup */}
                <motion.div
                    className="relative z-10 hidden md:block w-[280px] h-[580px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden shrink-0"
                    style={{ scale: phoneScale, opacity: phoneOpacity }}
                >
                    {/* Phone Screen Gradient/Content */}
                    <div className="absolute inset-0 bg-gray-50 flex flex-col">
                        {/* Mock App Header */}
                        <div className="bg-white p-5 pt-12 pb-2 shadow-sm z-10">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 leading-none">Good Food</h3>
                                    <p className="text-xs text-gray-500 font-medium">Table 4 • <span className="text-green-600">Online</span></p>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center relative">
                                    <ShoppingBag className="w-4 h-4 text-gray-700" />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#C04812] rounded-full text-[10px] text-white flex items-center justify-center font-bold">2</div>
                                </div>
                            </div>

                            {/* Stories / Highlights */}
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#C04812] to-orange-400">
                                        <div className="w-full h-full rounded-full border-2 border-white relative overflow-hidden">
                                            <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=80" alt="Burger" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-700">Must Try</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="w-14 h-14 rounded-full p-[2px] bg-gray-200">
                                        <div className="w-full h-full rounded-full border-2 border-white relative overflow-hidden">
                                            <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=100&q=80" alt="Pizza" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-500">Pizza</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                    <div className="w-14 h-14 rounded-full p-[2px] bg-gray-200">
                                        <div className="w-full h-full rounded-full border-2 border-white relative overflow-hidden">
                                            <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80" alt="Salad" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-500">Healthy</span>
                                </div>
                            </div>
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20">
                            {/* Feature: Dynamic Offers */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#C04812] to-orange-600 p-4 text-white shadow-lg">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Percent className="w-4 h-4 text-white/90" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-white/80">Special Offer</span>
                                    </div>
                                    <h4 className="text-2xl font-black italic">50% OFF</h4>
                                    <p className="text-xs text-white/90 font-medium">On all premium burgers today!</p>
                                </div>
                                <div className="absolute right-0 bottom-0 opacity-10">
                                    <Flame className="w-24 h-24 rotate-12 translate-x-4 translate-y-4" />
                                </div>
                            </div>

                            {/* Menu List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-gray-900">Popular Now</h4>
                                    <span className="text-xs text-[#C04812] font-bold cursor-pointer">View All</span>
                                </div>

                                {/* Item 1: Burger */}
                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3">
                                    <div className="w-24 h-24 rounded-xl bg-gray-100 relative overflow-hidden shrink-0">
                                        <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80" alt="Burger" className="w-full h-full object-cover" />
                                        <div className="absolute top-1 left-1 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-900 flex items-center gap-0.5">
                                            <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" /> 4.9
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col h-full justify-between py-1">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h5 className="font-bold text-gray-900 text-sm leading-tight mb-1">Double Cheeseburger</h5>
                                            </div>
                                            <p className="text-[10px] text-gray-500 line-clamp-2">Angus beef, cheddar, fresh lettuce & secret sauce.</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="font-bold text-gray-900">$12.99</span>
                                            <button className="bg-[#C04812] text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-md active:scale-95 transition-transform">
                                                <span className="text-lg font-medium leading-none mb-0.5">+</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Item 2: Pizza */}
                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3 opacity-90">
                                    <div className="w-24 h-24 rounded-xl bg-gray-100 relative overflow-hidden shrink-0 grayscale">
                                        <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80" alt="Pizza" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold px-2 py-1 bg-black/60 rounded">Sold Out</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col h-full justify-between py-1">
                                        <div>
                                            <h5 className="font-bold text-gray-900 text-sm leading-tight mb-1">Pepperoni Feast</h5>
                                            <p className="text-[10px] text-gray-500 line-clamp-2">Double pepperoni, mozzarella, tomato sauce.</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                            <span className="font-bold text-gray-400">$14.99</span>
                                            <button disabled className="bg-gray-100 text-gray-400 w-7 h-7 rounded-lg flex items-center justify-center cursor-not-allowed">
                                                <span className="text-lg font-medium leading-none mb-0.5">+</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Action Button */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgb(0,0,0,0.3)] hover:scale-105 transition-transform cursor-pointer z-20">
                            <span className="text-sm font-bold">View Cart (2)</span>
                        </div>
                    </div>
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl" />
                </motion.div>

                {/* Flying Feature Cards - Desktop */}
                {FEATURES.map((feature, index) => {
                    const stepSize = 0.12;
                    const start = 0.15 + (index * stepSize);
                    const end = start + 0.25;

                    const x = useTransform(smoothProgress, [start, end], [0, feature.x]);
                    const y = useTransform(smoothProgress, [start, end], [0, feature.y]);
                    const opacity = useTransform(smoothProgress, [start, start + 0.1], [0, 1]);
                    const scale = useTransform(smoothProgress, [start, end], [0, 1]);

                    return (
                        <motion.div
                            key={`desktop-${index}`}
                            style={{ x, y, opacity, scale }}
                            className="absolute z-20 hidden md:flex items-center gap-4 bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 max-w-[240px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#C04812]/10 flex items-center justify-center shrink-0">
                                <feature.icon className="w-6 h-6 text-[#C04812]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{feature.title}</h3>
                                <p className="text-xs text-gray-500">{feature.description}</p>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Mobile Feature List - Simple Vertical List */}
                <div className="md:hidden w-full px-4 space-y-2.5 pb-10 mt-4">
                    {FEATURES.map((feature, index) => {
                        // Sequential fade in based on scroll progress
                        const opacity = useTransform(scrollYProgress, [0 + (index * 0.05), 0.15 + (index * 0.05)], [0, 1]);
                        const y = useTransform(scrollYProgress, [0 + (index * 0.05), 0.15 + (index * 0.05)], [20, 0]);

                        return (
                            <motion.div
                                key={`mobile-list-${index}`}
                                style={{ opacity, y }}
                                className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#C04812]/10 flex items-center justify-center shrink-0">
                                    <feature.icon className="w-5 h-5 text-[#C04812]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{feature.title}</h3>
                                    <p className="text-sm text-gray-500 leading-tight">{feature.description}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
