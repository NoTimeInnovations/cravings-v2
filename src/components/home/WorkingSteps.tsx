"use client";

import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Check, Calendar, ArrowRight, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    label: "START",
    title: "Get started.",
    items: [
      "First PDF or images upload",
      "Enter basic details",
      "Choose brand color",
    ],
    active: false,
  },
  {
    label: "02 MINS",
    title: "Menu is ready.",
    items: [
      "Menu fully uploaded",
      "Make corrections if needed",
      "Menu is ready",
    ],
    active: false,
  },
  {
    label: "LIVE",
    title: "Go live & earn.",
    items: [
      "Share digital menu with customers",
      "Accept orders seamlessly",
      "Watch your revenue grow",
    ],
    active: true, // Highlighted step
  },
];

export default function WorkingSteps({
  appName = "Menuthere",
}: {
  appName?: string;
}) {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Grid Pattern (Matching other sections) */}

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-start pt-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-xs font-bold tracking-wider text-gray-500 mb-8 uppercase">
              <Store className="w-4 h-4" />
              How it works
            </div>

            <h2 className="text-3xl md:text-5xl font-medium text-gray-900 leading-[1.1] tracking-tight mb-8">
              Get your restaurant online in just <br />
              <span className="text-[#C04812]">2 minutes</span>
            </h2>

            <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-lg">
              Stop losing customers to outdated menus. Menuthere lets you
              instantly update products, add offers and specials, and toggle
              availability-fast.
            </p>

            <Link
              href="/get-started"
              className="bg-[#0a0b10] text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-gray-900 transition-colors shadow-lg flex items-center gap-2"
            >
              Get Started
            </Link>
          </motion.div>

          {/* Right Timeline */}
          <div className="relative pl-8 md:pl-0">
            {/* Vertical Line Container */}
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute left-0 md:left-[120px] top-6 bottom-0 w-px bg-gray-200 hidden md:block"
            />

            <div className="flex flex-col gap-8">
              {STEPS.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="relative flex flex-col md:flex-row gap-6 md:gap-12 items-start"
                >
                  {/* Timeline Badge/Label */}
                  <div className="flex-shrink-0 relative z-10 md:w-[120px] md:text-right pt-2 md:pt-0">
                    {/* Mobile Vertical Line */}
                    <div
                      className={cn(
                        "absolute left-3 top-8 bottom-[-48px] w-px md:hidden",
                        index === STEPS.length - 1
                          ? "bg-[#C04812]"
                          : "bg-gray-200",
                        index === STEPS.length - 1 && "h-full", // Ensure last line doesn't extend too far
                      )}
                    />

                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider",
                        step.active
                          ? "bg-[#C04812] border-[#C04812] text-white"
                          : "bg-white border-gray-200 text-gray-500",
                      )}
                    >
                      <Calendar className="w-3 h-3" />
                      {step.label}
                    </div>

                    {/* Desktop highlighted line segment for active step */}
                    {step.active && (
                      <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: "calc(100% + 3rem)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="absolute hidden md:block right-[-1px] top-4 bottom-[-100px] w-px bg-[#C04812]"
                      />
                    )}
                  </div>

                  {/* Content Card */}
                  <div
                    className={cn(
                      "flex-1 rounded-2xl p-6 w-full",
                      step.active
                        ? "bg-[#F0FDF4]/0 border border-[#C04812]/10 bg-[#C04812]/5"
                        : "bg-[#F6F6F6]",
                    )}
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {step.title}
                    </h3>
                    <ul className="space-y-3">
                      {step.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check
                            className={cn(
                              "w-4 h-4 shrink-0 mt-0.5",
                              step.active ? "text-[#C04812]" : "text-gray-400",
                            )}
                          />
                          <span className="text-sm text-gray-600 font-medium">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
