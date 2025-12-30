"use client";

import { motion } from "motion/react";
import React from "react";
import { Edit, Tag, Zap } from "lucide-react";

const features = [
    {
        icon: <Edit className="h-7 w-7 text-blue-600" />,
        color: "bg-blue-50",
        title: "Instant Menu Editing",
        description: "Update prices, descriptions, and images instantly. No more waiting for designers or re-printing PDFs."
    },
    {
        icon: <Tag className="h-7 w-7 text-purple-600" />,
        color: "bg-purple-50",
        title: "Offers & Specials",
        description: "Run happy hour specials or create limited-time offers to boost sales during slow hours."
    },
    {
        icon: <Zap className="h-7 w-7 text-green-600" />,
        color: "bg-green-50",
        title: "Availability Control",
        description: "Mark items as \"Sold Out\" instantly to avoid awkward customer service moments."
    }
];

export default function Features() {
    return (
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
                {/* <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-bold text-gray-900 mb-6"
                >
                    Everything you need for a <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">beautiful digital menu</span>
                </motion.h2> */}
                {/* <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-gray-600"
                >
                    Powerful features designed to increase orders and simplify management.
                </motion.p> */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                {/* {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -10, transition: { duration: 0.2 } }}
                        className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-white rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500 ease-in-out" />

                        <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:rotate-6 transition-transform`}>
                            {feature.icon}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">{feature.title}</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed relative z-10">
                            {feature.description}
                        </p>
                    </motion.div>
                ))} */}
            </div>
        </div>
    );
}
