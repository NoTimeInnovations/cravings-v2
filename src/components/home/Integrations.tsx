"use client";

import React from "react";
import Link from "next/link";
import { Globe, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

const INTEGRATIONS = [
  {
    title: "Google Business Profile Sync",
    description: "Automatically sync your menu with Google Maps. When customers search for you, they see your latest menu, prices, and availability.",
    icon: Globe,
    href: "/solutions/google-business",
    color: "bg-blue-500",
    features: [
      "One-click connection",
      "Real-time menu sync",
      "Improve local SEO",
      "Multi-location support"
    ]
  },
  {
    title: "PetPooja Integration",
    description: "Connect your digital menu with PetPooja POS. Menu updates, orders, and inventory sync automatically — no double entry.",
    icon: Zap,
    href: "/solutions/petpooja",
    color: "bg-purple-500",
    features: [
      "Real-time POS sync",
      "Order flow to kitchen",
      "Inventory updates",
      "Zero manual entry"
    ]
  }
];

export default function Integrations() {
  return (
    <section className="py-24 bg-[#f4e5d5] relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-[#e65a22]/10 text-[#e65a22] rounded-full text-sm font-semibold mb-4">
            Powerful Integrations
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Connect With Tools You Love
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Seamlessly integrate with Google Business Profile and PetPooja POS for effortless operations
          </p>
        </motion.div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {INTEGRATIONS.map((integration, idx) => (
            <motion.div
              key={integration.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="flex flex-col h-full">
                {/* Icon */}
                <div className={`w-16 h-16 ${integration.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <integration.icon className="w-8 h-8 text-white" />
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#e65a22] transition-colors">
                  {integration.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {integration.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {integration.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-auto">
                  <Link
                    href={integration.href}
                    className="inline-flex items-center text-[#e65a22] font-semibold hover:text-[#d14d1a] transition-colors"
                  >
                    Learn more
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <Link
            href="/solutions"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#e65a22] rounded-xl hover:bg-[#d14d1a] transition-colors"
          >
            View All Solutions
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
