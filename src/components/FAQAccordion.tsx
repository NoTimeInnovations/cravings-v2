"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQAccordionProps {
    items: FAQItem[];
    title?: string;
    subtitle?: string;
    className?: string;
}

export function FAQAccordion({
    items,
    title = "Frequently Asked Questions",
    subtitle,
    className = "",
}: FAQAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <section className={`py-24 relative ${className}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="space-y-3">
                    {items.map((item, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={idx}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-shadow hover:shadow-md"
                            >
                                <button
                                    onClick={() => toggle(idx)}
                                    className="w-full flex items-center justify-between gap-4 p-6 text-left cursor-pointer"
                                    aria-expanded={isOpen}
                                >
                                    <h3 className="text-lg font-bold text-gray-900 flex items-start gap-3">
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-sm font-bold flex-shrink-0 mt-0.5">
                                            Q
                                        </span>
                                        {item.question}
                                    </h3>
                                    <ChevronDown
                                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>
                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${isOpen
                                            ? "grid-rows-[1fr] opacity-100"
                                            : "grid-rows-[0fr] opacity-0"
                                        }`}
                                >
                                    <div className="overflow-hidden">
                                        <p className="text-gray-600 leading-relaxed px-6 pb-6 pl-16">
                                            {item.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
