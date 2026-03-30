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
    question: "How is Menuthere different from Zomato or Swiggy?",
    answer:
      "Aggregators like Zomato and Swiggy charge 20-33% commission on every order. Menuthere gives you your own branded delivery website where customers order directly from you, with just 1% commission. You own the customer data, control your pricing, and build brand loyalty.",
  },
  {
    question: "How does the Petpooja POS integration work?",
    answer:
      "Once connected, your Petpooja menu syncs automatically with your Menuthere delivery website. Every online order is pushed directly to your POS in real-time. No manual entry, no missed orders. Menu items, prices, and categories stay in sync across both systems.",
  },
  {
    question: "How do I set up my delivery zones and charges?",
    answer:
      "From your dashboard, go to Delivery Settings. Define delivery zones by radius or pin code, set delivery charges per zone, and configure minimum order amounts. You can also enable or disable delivery for specific areas anytime.",
  },
  {
    question: "Can customers order for pickup as well as delivery?",
    answer:
      "Yes, your delivery website supports both delivery and pickup orders. Customers can choose their preference at checkout. You can enable or disable either option from your dashboard settings.",
  },
  {
    question: "How do I manage incoming orders during rush hours?",
    answer:
      "All orders appear in your dashboard in real-time with instant notifications. You can accept, prepare, and update order status from one screen. Orders also sync to your Petpooja POS if connected, so your kitchen stays in the loop.",
  },
  {
    question: "Do I need any technical skills to set this up?",
    answer:
      "Not at all. Upload your menu (or sync it from Petpooja), customize your branding, and your delivery website is live in minutes. No coding, no designers, no app downloads needed.",
  },
  {
    question: "Can I run offers and discounts on my delivery website?",
    answer:
      "Yes! Run flash deals, coupon codes, first-order discounts, or time-based specials that activate and expire automatically. Highlight best-sellers with Must-Try badges to boost average order value.",
  },
  {
    question: "How do customers find my delivery website?",
    answer:
      "Share your website link on social media, WhatsApp, Google Business Profile, and in-store QR codes. Menuthere also syncs your menu to Google Maps so customers discover you organically. Your website is SEO-optimized out of the box.",
  },
  {
    question: "What payment methods are supported?",
    answer:
      "Menuthere supports UPI, debit/credit cards, net banking, and cash on delivery via Razorpay. Payments go directly to your account. We never hold your money.",
  },
  {
    question: "Will I be able to turn off ordering during offline hours?",
    answer:
      "Yes. Go to Settings and toggle your restaurant off anytime, perfect for offline hours, holidays, or maintenance. Toggle back on when ready. You can also set automatic open/close schedules.",
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes, cancel anytime from your account. Your plan stays active until the current billing period ends, with no further charges unless you renew.",
  },
];

export default function FAQ() {
  return (
    <section className="py-24 bg-white relative overflow-hidden sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto border-r border-l border-stone-200">

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
