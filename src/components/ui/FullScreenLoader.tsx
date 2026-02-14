"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Sparkles } from "lucide-react";
import Image from "next/image";

interface FullScreenLoaderProps {
    isLoading: boolean;
    loadingTexts?: string[];
}

export default function FullScreenLoader({ isLoading, loadingTexts }: FullScreenLoaderProps) {
    const defaultTexts = [
        "Loading...",
        "Please wait...",
        "Almost there..."
    ];
    const textsToUse = loadingTexts || defaultTexts;
    const [loadingText, setLoadingText] = useState(textsToUse[0]);

    useEffect(() => {
        if (isLoading) {
            let index = 0;
            const interval = setInterval(() => {
                index = (index + 1) % textsToUse.length;
                setLoadingText(textsToUse[index]);
            }, 800);
            return () => clearInterval(interval);
        }
    }, [isLoading, textsToUse]);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md p-4"
                >
                    <div className="relative">
                        {/* Background Circles */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.1, 0.3],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="absolute -inset-12 bg-orange-200 rounded-full blur-2xl"
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.2, 0.05, 0.2],
                                rotate: 180
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.5
                            }}
                            className="absolute -inset-16 bg-yellow-200 rounded-full blur-3xl"
                        />

                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
                            transition={{
                                duration: 0.8,
                                ease: "easeOut",
                                rotate: {
                                    scale: 1,
                                    opacity: 1,
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                    duration: 1
                                }
                            }}
                            className="relative z-10 bg-white p-6 rounded-3xl shadow-2xl border border-orange-100"
                        >
                            <Image src="/menuthere-logo.png" alt="Menuthere" width={64} height={64} className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                            <motion.div
                                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute -top-2 -right-2"
                            >
                                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Text */}
                    <motion.div
                        className="mt-12 text-center relative z-10"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3 tracking-tight">
                            {loadingText}
                        </h2>
                        <p className="text-gray-500 text-base md:text-lg flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                            Please do not close this window
                        </p>
                    </motion.div>

                    {/* Progress Bar */}
                    <motion.div
                        className="mt-6 md:mt-8 h-1.5 w-48 md:w-64 bg-gray-100 rounded-full overflow-hidden relative z-10"
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2.5, ease: "easeInOut" }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
