import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import PricingSection from "@/components/international/PricingSection";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import HowItWorks from "@/components/home/HowItWorks";
import Background from "@/components/home/Background";

export const metadata: Metadata = {
  title: "Cravings Digital Menu | The #1 QR Menu Creator for Restaurants",
  description: "Create a stunning digital menu instantly. No apps required. The smartest restaurant menu creator with QR codes, real-time editing, and marketing tools. Try for free.",
  keywords: ["Digital Menu", "QR Code Menu", "Restaurant Menu App", "Contactless Menu", "Menu Creator"],
  openGraph: {
    title: "Cravings Digital Menu | The #1 QR Menu Creator",
    description: "Create a stunning digital menu instantly with Cravings. Join 400+ restaurants growing their business.",
    images: ["/placeholder-menu-qr.jpg"],
    type: "website",
  },
};

import { headers } from "next/headers";

export default async function Home() {
  const headersList = await headers();
  const country = headersList.get("x-user-country") || "US";
  return (
    <div className="min-h-screen w-full font-sans text-gray-900 relative">
      {/* SEO Fallback Content (Hidden visually but visible to crawlers) */}
      <div style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0'
      }}>
        <h1>The Ultimate Digital Menu Creator</h1>
        <p>Create a stunning digital menu in seconds. No apps to download. Just a simple QR code that opens a world of flavors.</p>

        <h2>Everything you need for a beautiful digital menu</h2>
        <p>Powerful features designed to increase orders and simplify management.</p>
        <ul>
          <li>
            <h3>Instant Menu Editing</h3>
            <p>Update prices, descriptions, and images instantly. No more waiting for designers or re-printing PDFs.</p>
          </li>
          <li>
            <h3>Offers & Specials</h3>
            <p>Run happy hour specials or create limited-time offers to boost sales during slow hours.</p>
          </li>
          <li>
            <h3>Availability Control</h3>
            <p>Mark items as &quot;Sold Out&quot; instantly to avoid awkward customer service moments.</p>
          </li>
        </ul>

        <h2>How it works</h2>
        <p>Get your digital menu running in minutes.</p>
        <ol>
          <li>
            <h3>Create your menu</h3>
            <p>Upload your menu (PDF or images) or add items manually. No credit card needed. No technical setup.</p>
          </li>
          <li>
            <h3>Customize & update</h3>
            <p>Edit prices, items, availability, offers, and photos anytime. Match your menu to your brand with colors and layout.</p>
          </li>
          <li>
            <h3>Share with customers</h3>
            <p>Scan the QR code or share the link. Customers always see your latest menu — no reprints needed.</p>
          </li>
        </ol>

        <h2>Simple, Transparent Pricing</h2>
        <p>Choose the plan that fits your growth.</p>
        <ul>
          <li>
            <h3>Free Plan ($0/month)</h3>
            <p>Perfect for trying out Cravings.</p>
            <ul>
              <li>100 scans per month</li>
              <li>Unlimited offers</li>
              <li>Unlimited edits</li>
              <li>Chat support</li>
            </ul>
          </li>
          <li>
            <h3>Standard Plan ($9/month)</h3>
            <p>For growing restaurants.</p>
            <ul>
              <li>1000 scans per month</li>
              <li>Unlimited offers</li>
              <li>Unlimited edits</li>
              <li>Priority support</li>
            </ul>
          </li>
          <li>
            <h3>Plus Plan ($29/month)</h3>
            <p>For high-volume venues.</p>
            <ul>
              <li>Unlimited scans</li>
              <li>Unlimited offers</li>
              <li>Unlimited edits</li>
              <li>Priority chat support</li>
            </ul>
          </li>
        </ul>
      </div>
      <Background />

      {/* HERO SECTION (Client Component for Animations) */}
      <Hero />

      {/* MARQUEE SECTION */}
      <section className="py-10 bg-white/50 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
            Trusted by Top Restaurants & Hotels
          </p>
          <RestaurantMarquee />
        </div>
      </section>

      {/* FEATURES SECTION (Client Component for Hover Effects) */}
      <section className="py-24 relative overflow-hidden" id="features">
        <div className="absolute inset-0 bg-white/40 -z-10" />
        <Features />
      </section>

      {/* HOW IT WORKS SECTION (Client Component for Step Animations) */}
      <section className="py-24 bg-white/60 backdrop-blur-sm border-y border-white">
        <HowItWorks />
      </section>

      {/* PRICING SECTION */}
      <PricingSection country={country} />

      {/* FOOTER CTA */}
      <footer className="bg-white py-24 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-4xl font-bold text-gray-900 mb-6">Ready to upgrade your menu?</h3>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join 400+ restaurants using Cravings to deliver a better customer experience.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/get-started">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-6 rounded-lg text-xl shadow-lg w-full sm:w-auto hover:shadow-orange-200 transition-all">
                Get Started Now
              </Button>
            </Link>
            <a href="https://wa.me/918590115462?text=Hi!%20I%27m%20interested%20in%20Cravings%20Digital%20Menu" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-2 border-gray-200 text-gray-700 hover:border-orange-600 hover:text-orange-600 px-10 py-6 rounded-lg text-xl w-full sm:w-auto">
                Contact Sales
              </Button>
            </a>
          </div>
        </div>
      </footer>
    </div >
  );
}
