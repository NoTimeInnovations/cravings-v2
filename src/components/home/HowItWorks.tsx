"use client";

import { motion } from "motion/react";
import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const steps = [
    {
        number: "1",
        title: "Create Account",
        description: "Sign up for free. No credit card required. Choose a template that fits your brand."
    },
    {
        number: "2",
        title: "Build Your Menu",
        description: "Add your items, upload photos, and organize categories with our easy editor."
    },
    {
        number: "3",
        title: "Share & Profit",
        description: "Download your QR code, place it on tables, and start taking orders."
    }
];

export default function HowItWorks() {
    return (
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-bold text-gray-900 mb-6"
                >
                    How it works
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-gray-600"
                >
                    Get your digital menu running in minutes.
                </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-[60px] left-[16%] right-[16%] h-0.5 bg-gray-100 -z-10">
                    <motion.div
                        initial={{ width: "0%" }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-orange-200 to-orange-400"
                    />
                </div>

                {steps.map((step, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.2 }}
                        className="flex flex-col items-center text-center group"
                    >
                        <div className="w-24 h-24 bg-white border-4 border-orange-50 rounded-full flex items-center justify-center text-3xl font-bold text-orange-600 shadow-sm mb-6 z-10 group-hover:scale-110 transition-transform duration-300 group-hover:border-orange-100">
                            {step.number}
                        </div>
                        <h4 className="text-2xl font-bold mb-3 text-gray-900">{step.title}</h4>
                        <p className="text-gray-600 leading-relaxed px-4 text-base">
                            {step.description}
                        </p>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="mt-20 text-center"
            >
                <Link href="/get-started">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-6 rounded-full text-xl shadow-xl shadow-orange-200 hover:shadow-orange-300 transition-all hover:-translate-y-1">
                        Get free Menu <ArrowRight className="ml-2 w-6 h-6" />
                    </Button>
                </Link>
            </motion.div>
        </div>
    );
}
