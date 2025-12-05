import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed, Edit, Tag, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import HeroButtons from "@/components/international/HeroButtons";
import PricingSection from "@/components/international/PricingSection";

export const metadata: Metadata = {
    title: "Cravings Digital Menu | The Smartest Menu Creator for Restaurants",
    description: "Create your digital menu instantly with Cravings. The easiest restaurant menu creator with QR codes, real-time updates, and no app required. Try it free.",
    keywords: ["Digital Menu", "Menu Creator", "Restaurant Menu Creator", "Hotel Menu Creator", "QR Code Menu", "Contactless Menu"],
    openGraph: {
        title: "Cravings Digital Menu Creator",
        description: "Create beautiful digital menus for your restaurant or hotel in seconds.",
        images: ["/placeholder-menu-qr.jpg"],
    },
};

export default function InternationalPage() {
    const restaurants = [
        { url: "https://www.cravings.live/qrScan/CHICKING-OOTY/6ec40577-e2d5-4a47-80ec-5e63ab9f9677", name: "CHICKING OOTY", logo: "/logos/chicking.png" },
        { url: "https://www.cravings.live/hotels/3305e7f2-7e35-4ddc-8ced-c57e164d9247", name: "80's Malayalees", logo: "/logos/malayalees.jpg" },
        { url: "https://www.cravings.live/hotels/f58ebdef-b59b-435e-a3bf-90e562a456ed", name: "Proyal", logo: "/logos/proyal.png" },
        { url: "https://www.cravings.live/hotels/9e159a20-8c81-4986-b471-3876de315fc7", name: "Malabar Juice N Cafe", logo: "/logos/malabar.jpg" },
    ];

    return (
        <div className="min-h-screen w-full font-sans text-gray-900">
            {/* HERO */}
            <header className="bg-gradient-to-b from-orange-50 to-orange-100 py-20 lg:py-28 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-16 relative z-10">
                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-6 animate-fade-in-up">
                            <UtensilsCrossed className="h-8 w-8 text-orange-600" />
                            <span className="text-sm font-semibold px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wide">
                                Cravings Digital Menu
                            </span>
                        </div>

                        <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
                            Create Your Digital Menu Instantly: <span className="text-orange-600">The Smartest Menu Creator</span>
                        </h1>

                        <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Transform your guest experience with a modern digital menu. Edit items in seconds, manage availability, and share via QR code. Perfect for restaurants and hotels.
                        </p>

                        <div className="flex flex-col items-center lg:items-start gap-4">
                            <HeroButtons />
                            <p className="text-sm text-gray-500 font-medium ml-1">
                                No credit card required. Full access included.
                            </p>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-6">
                            <div className="flex -space-x-3">
                                {restaurants.map((r, i) => (
                                    <div key={i} className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                                        <Image
                                            src={r.logo}
                                            alt={`${r.name} using Cravings Digital Menu`}
                                            width={48}
                                            height={48}
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="text-sm text-gray-700">
                                <span className="font-bold text-gray-900">400+</span> restaurants trust Cravings
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-xl lg:max-w-none relative">
                        <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-white transform hover:scale-[1.01] transition-transform duration-500">
                            <Image
                                src="/placeholder-menu-qr.jpg"
                                alt="Cravings Digital Menu creator software interface showing menu editing and QR preview"
                                width={900}
                                height={600}
                                priority
                                className="w-full h-auto"
                            />
                        </div>
                        <div className="absolute -bottom-6 -right-6 md:right-10 p-4 bg-white rounded-xl shadow-xl border border-gray-100 animate-bounce-subtle">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">4.9/5</div>
                                    <div className="text-xs text-gray-500">Restaurant Rating</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Marquee Section */}
            <section className="py-10 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
                        Trusted by Top Restaurants & Hotels
                    </p>
                    <RestaurantMarquee />
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-gray-50" id="features">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Everything you need for a beautiful digital menu
                        </h2>
                        <p className="text-lg text-gray-600">
                            Powerful features designed to increase orders and simplify management.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                        {/* Feature 1 */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100/50">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                <Edit className="h-7 w-7 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Menu Editing</h3>
                            <p className="text-gray-700 mb-6 leading-relaxed">
                                Update prices, descriptions, and images instantly. No more waiting for designers or re-printing PDFs.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100/50">
                            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                                <Tag className="h-7 w-7 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Offers & Specials</h3>
                            <p className="text-gray-700 mb-6 leading-relaxed">
                                Run happy hour specials or create limited-time offers to boost sales during slow hours.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100/50">
                            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="h-7 w-7 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Availability Control</h3>
                            <p className="text-gray-700 mb-6 leading-relaxed">
                                Mark items as "Sold Out" instantly to avoid awkward customer service moments.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
                        <p className="text-lg text-gray-600">Get your digital menu running in minutes.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gray-100 -z-10" />

                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-2 border-orange-100 rounded-full flex items-center justify-center text-2xl font-bold text-orange-600 shadow-sm mb-6 z-10">
                                1
                            </div>
                            <h4 className="text-xl font-bold mb-3 text-gray-900">Create Account</h4>
                            <p className="text-gray-600 leading-relaxed px-4">
                                Sign up for free. No credit card required. Choose a template that fits your brand.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-2 border-orange-100 rounded-full flex items-center justify-center text-2xl font-bold text-orange-600 shadow-sm mb-6 z-10">
                                2
                            </div>
                            <h4 className="text-xl font-bold mb-3 text-gray-900">Build Your Menu</h4>
                            <p className="text-gray-600 leading-relaxed px-4">
                                Add your items, upload photos, and organize categories with our easy editor.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-2 border-orange-100 rounded-full flex items-center justify-center text-2xl font-bold text-orange-600 shadow-sm mb-6 z-10">
                                3
                            </div>
                            <h4 className="text-xl font-bold mb-3 text-gray-900">Share & Profit</h4>
                            <p className="text-gray-600 leading-relaxed px-4">
                                Download your QR code, place it on tables, and start taking orders.
                            </p>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <Link href="/get-started">
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-full text-lg shadow-lg">
                                Start your free trial
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <PricingSection />

            {/* Footer CTA */}
            <footer className="bg-white py-20 border-t border-gray-100">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h3 className="text-3xl font-bold text-gray-900 mb-6">Ready to upgrade your menu?</h3>
                    <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                        Join 400+ restaurants using Cravings to deliver a better customer experience.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/get-started">
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-full text-lg shadow-lg w-full sm:w-auto">
                                Get Started Now
                            </Button>
                        </Link>
                        <a href="https://wa.me/918590115462?text=Hi!%20I%27m%20interested%20in%20Cravings%20Digital%20Menu" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="border-2 border-gray-200 text-gray-700 hover:border-orange-600 hover:text-orange-600 px-8 py-4 rounded-full text-lg w-full sm:w-auto">
                                Contact Sales
                            </Button>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
