"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How do I stop customers finding old menus on Google or apps?",
    answer:
      "All changes-like products, prices, descriptions, or availability-are applied instantly to your digital menu. Verify by clicking View Menu from your dashboard; no delays or reprints needed.",
  },
  {
    question: "Out-of-stock items still show on my QR/digital menu-what gives?",
    answer:
      "In the Menu section, click Availability at the top. Toggle entire categories or individual items on/off with a single click-sold-out items vanish everywhere immediately.",
  },
  {
    question: "Updating menus takes forever and costs a fortune in designers.",
    answer:
      "Editing is extremely simple and takes seconds-no technical knowledge required. Go to the Menu section, click any product to update name, price, image, description, offers, or variants, then save. Changes go live instantly.",
  },
  {
    question: "How do I instantly update my menu products?",
    answer:
      "Go to the Menu section in your dashboard. You'll see all categories and products listed-click any to edit details like name, price, image, or description, then save for instant updates.",
  },
  {
    question: "How do I rearrange menu items or categories?",
    answer:
      "Open the Menu section and click Priority. Drag or set priority numbers for categories and items, then save-the new order appears live right away.",
  },
  {
    question: "How do I add offers or specials to menu items?",
    answer:
      "For Specials/Best Sellers: In Menu section, toggle the option per item-they'll appear as Must-Try at the top. For custom offers: Go to Offers section, create single/multi-item deals, and they activate instantly.",
  },
  {
    question: "Hard to update banners or product images without tech help?",
    answer:
      "Navigate to Settings → General Settings to upload/change your restaurant banner. For products, edit images directly in the Menu section-drag-and-drop simple, live immediately.",
  },
  {
    question: "Can I preview or schedule changes like daily specials easily?",
    answer:
      "Yes-preview any edit via View Menu before saving. For scheduling, use the Offers section to set timed updates (e.g., daily specials)-automate without daily logins.",
  },
  {
    question: "Will I be able to turn the store off during offline hours?",
    answer:
      "Yes. Go to Settings and toggle your restaurant off anytime-perfect for offline hours, closures, or maintenance. Toggle back on when ready.",
  },
  {
    question: "How easy is it overall to edit menu items?",
    answer:
      "Extremely-seconds per change. Update prices, names, images, availability, or offers via intuitive toggles/dropdowns in the Menu section, no coding or designers.",
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes-cancel anytime from your account. Your plan stays active until the current billing period ends, with no further charges unless you renew.",
  },
];

export default function FAQ() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto border-r border-l border-stone-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="geist-font text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight">
              Frequently asked{" "}
              <span className="text-gray-400 italic">questions.</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-gray-200 last:border-b-0 py-1"
              >
                <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-sm leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
    </section>
  );
}
