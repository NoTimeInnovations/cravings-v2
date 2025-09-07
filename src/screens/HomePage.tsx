"use client";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ShoppingCart, Check, X, ChevronRight, Star, FileText } from "lucide-react";
// import { PartnerDialog } from "@/components/PartnerDialog";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

export default function HomePage() {
  const navigate = useRouter();
  const [isIndianPricing, setIsIndianPricing] = useState(true);

  // Restaurant partners data from hotel-list.txt
  const restaurants = [
    { url: "https://www.cravings.live/qrScan/CHICKING-OOTY/6ec40577-e2d5-4a47-80ec-5e63ab9f9677", name: "CHICKING OOTY", logo: "/logos/chicking.png" },
    { url: "https://www.cravings.live/hotels/3305e7f2-7e35-4ddc-8ced-c57e164d9247", name: "80's Malayalees", logo: "/logos/malayalees.jpg" },
    { url: "https://www.cravings.live/hotels/f58ebdef-b59b-435e-a3bf-90e562a456ed", name: "Proyal", logo: "/logos/proyal.png" },
    { url: "https://www.cravings.live/hotels/9e159a20-8c81-4986-b471-3876de315fc7", name: "Malabar Juice N Cafe", logo: "/logos/malabar.jpg" },
    { url: "https://www.cravings.live/hotels/9c23425d-7489-4a00-9a61-809e3e2b96cc", name: "Chillies Restaurant", logo: "/logos/chillies.webp" },
    { url: "https://www.cravings.live/hotels/e977b73a-c286-4572-bd1d-93345e960f7c", name: "CUP OF COFFEE", logo: "/logos/coc.webp" },
    { url: "https://www.cravings.live/hotels/3980e6dd-65ca-4b36-825d-410867d8d67d", name: "Periyar Club", logo: "/logos/periyar.webp" },
    { url: "https://www.cravings.live/hotels/e7cba2a1-4474-4841-84b1-e1538d938fc7", name: "Bites Of Malabar", logo: "/logos/bites.webp" },
    { url: "https://www.cravings.live/hotels/082a004a-a3f7-428d-89e0-f56d30e47ba0", name: "BISTRIO", logo: "/logos/bistrio.webp" }
  ];

  // Triple the array for continuous scrolling
  const duplicatedRestaurants = [...restaurants, ...restaurants, ...restaurants];

  const scrollRef1 = useRef<HTMLDivElement>(null);
  const animationRef1 = useRef<number | null>(null);

  // Scroll animation using requestAnimationFrame
  useEffect(() => {
    let scrollPosition1 = 0;

    const scroll1 = () => {
      if (scrollRef1.current) {
        // Increase scroll position - left to right scrolling
        scrollPosition1 -= 0.5;

        // Reset when scrolled enough to create seamless loop
        if (scrollPosition1 <= -1500) {
          scrollPosition1 = 0;
        }

        scrollRef1.current.style.transform = `translateX(${scrollPosition1}px)`;
        animationRef1.current = requestAnimationFrame(scroll1);
      }
    };

    animationRef1.current = requestAnimationFrame(scroll1);

    return () => {
      if (animationRef1.current) {
        cancelAnimationFrame(animationRef1.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen w-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-orange-50 to-orange-100 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 md:space-y-8">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <UtensilsCrossed className="h-8 w-8 text-orange-600" />
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-orange-100 text-orange-700">Restaurant Management Platform By Cravings</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                  Digital Menus & Custom Delivery Platform for Modern Restaurants
                </h1>
              </div>

              <p className="text-xl text-gray-600 leading-relaxed">
                Elevate your restaurant with QR code menus, self-ordering, and your own delivery website. Control your prices, add extra charges, and manage your own delivery system.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* <Button
                  onClick={() => navigate.push("/partner")}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Start Your Free Trial
                </Button> */}
                <Button
                  onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20partnering%20with%20Cravings.%20Can%20you%20share%20the%20details", "_blank")}
                  variant="outline"
                  className="bg-white hover:bg-gray-50 text-orange-600 border border-orange-600 px-8 py-6 text-lg rounded-full transition-all duration-300 flex items-center gap-2"
                >
                  <span>Book a Demo</span>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {restaurants.slice(0, 4).map((restaurant, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-white flex items-center justify-center overflow-hidden">
                      <Image
                        src={restaurant.logo}
                        alt={restaurant.name}
                        width={30}
                        height={30}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">80+</span> restaurants trust Cravings
                </p>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-orange-200 rounded-full opacity-50 blur-3xl"></div>
              <div className="relative z-10 rounded-lg overflow-hidden shadow-2xl border-8 border-white">
                <div className="relative bg-white p-4 border-b border-gray-100">
                  <div className="w-16 h-1 bg-gray-200 rounded mx-auto"></div>
                </div>
                <Image
                  src="/placeholder-menu-qr.jpg"
                  alt="Digital menu with QR code"
                  width={600}
                  height={450}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=600&h=450&auto=format&fit=crop";
                  }}
                />
              </div>
              <div className="absolute -bottom-6 right-4 p-3 bg-white rounded-lg shadow-lg border border-gray-100 z-20 max-w-[200px]">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs font-medium ml-1">4.9</span>
                </div>
                <p className="text-xs text-gray-600">
                  Customers love our digital menu experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brands Section */}
      <div className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm font-medium mb-8">TRUSTED BY LEADING RESTAURANTS</p>

          {/* Scrolling row */}
          <div className="relative overflow-hidden">
            <div className="flex overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
              <div ref={scrollRef1} className="flex">
                {duplicatedRestaurants.map((restaurant, i) => (
                  <a
                    href={restaurant.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={`row1-${i}`}
                    className="group mx-3 shrink-0"
                  >
                    <div className="bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-lg p-4 transition-colors flex flex-col items-center justify-center h-32 w-[180px] relative overflow-hidden">
                      {/* Subtle animation effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity">
                        <div className="absolute inset-0 bg-orange-500 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 origin-center"></div>
                      </div>

                      {/* Restaurant logo */}
                      <div className="h-16 w-full flex items-center justify-center mb-2 relative">
                        <Image
                          src={restaurant.logo}
                          alt={restaurant.name}
                          width={100}
                          height={60}
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>

                      {/* Restaurant name */}
                      <p className="text-center text-sm font-medium text-gray-700 group-hover:text-orange-700 transition-colors relative z-10 line-clamp-1">
                        {restaurant.name}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Key Features</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage and grow your restaurant business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Digital Menu Feature */}
            <div className="relative bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Interactive Digital Menu
              </h3>
              <ul className="space-y-3">
                {["Real-time menu updates", "Visual dish displays", "QR code integration", "Allergen information"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Self-Ordering Feature */}
            <div className="relative bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <ShoppingCart className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Smart Self-Ordering System
              </h3>
              <ul className="space-y-3">
                {["Contactless ordering", "Real-time order tracking", "Customizable options"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Delivery Website Feature */}
            <div className="relative bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-orange-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Your Own Delivery Platform
              </h3>
              <ul className="space-y-3">
                {[
                  "Custom pricing control",
                  "Add extra charges",
                  "Multiple WhatsApp channels",
                  "Manage your own delivery"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Get started with digital menus in just three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: "Create an account",
                description: "Sign up for free and set up your restaurant profile in minutes."
              },
              {
                step: 2,
                title: "Upload your menu",
                description: "Our AI-powered system will transform your menu into a digital format."
              },
              {
                step: 3,
                title: "Download QR codes",
                description: "Place QR codes on tables and start accepting digital orders."
              }
            ].map((item) => (
              <div key={item.step} className="bg-white p-8 rounded-xl shadow-sm relative">
                <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center text-xl font-bold absolute -top-6 left-8">
                  {item.step}
                </div>
                <div className="pt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="py-16 md:py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Pricing Plans</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that works best for your restaurant
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 p-1 rounded-lg inline-flex">
              <button
                className={`px-6 py-2 rounded-md font-medium transition-colors ${isIndianPricing ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setIsIndianPricing(true)}
              >
                India Pricing
              </button>
              <button
                className={`px-6 py-2 rounded-md font-medium transition-colors ${!isIndianPricing ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setIsIndianPricing(false)}
              >
                International Pricing
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
            {/* Basic Plan */}
            {/* <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-orange-50 to-white">
                <h3 className="text-2xl font-bold text-gray-900">Basic</h3>
                <div className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        {isIndianPricing ? (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">₹300</span>
                            <span className="text-sm text-gray-600 block">monthly</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">$12</span>
                            <span className="text-sm text-gray-600 block">monthly</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        {isIndianPricing ? (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">₹3000</span>
                            <span className="text-sm text-gray-600 block">yearly</span>
                            <span className="text-xs text-green-600">Save ₹600</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">$120</span>
                            <span className="text-sm text-gray-600 block">yearly</span>
                            <span className="text-xs text-green-600">Save $24</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-5">
                <p className="font-semibold text-gray-800 uppercase text-sm tracking-wider">MENU DIGITALIZATION:</p>

                {[
                  "Create shareable offers",
                  "Theme color customization",
                  "Menu customization (images, prices, names)",
                  "Reorder categories",
                  "Edit/add \"Must Try\" dishes",
                  "Google reviews integration", 
                  "Social media integration"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="bg-orange-100 rounded-full p-1">
                      <Check className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700 group-hover:text-orange-600 transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="p-8 border-t border-gray-100 space-y-4 bg-gray-50">
                <Button
                  onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20the%20menu%20plan.%20Can%20you%20share%20more%20details%20about%20this?", "_blank")}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
                >
                  Select Plan
                </Button>
                <Button
                  onClick={() => {
                    navigate.push("/hotels/Fried-Express/322331a7-8487-404a-a371-ae73e1afec82");
                    window.scrollTo(0, 0);
                  }}
                  className="w-full bg-white hover:bg-orange-50 text-orange-500 border-2 border-orange-500 font-semibold py-3"
                >
                  View Demo
                </Button>
              </div>
            </div> */}

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-orange-50 to-white">
                <h3 className="text-2xl font-bold text-gray-900">Pro</h3>
                <div className="mt-4">
                  <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                      {isIndianPricing ? (
                        <>
                          <span className="text-4xl font-bold text-orange-500">₹500</span>
                          <span className="text-lg text-gray-600">one-time setup fee</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-orange-500">$12</span>
                          <span className="text-lg text-gray-600">setup fee</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        {isIndianPricing ? (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">₹10</span>
                            <span className="text-sm text-gray-600 block">per delivery order</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">$0.50</span>
                            <span className="text-sm text-gray-600 block">per delivery order</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        {isIndianPricing ? (
                          <div className="text-center">
                            <span className="text-lg font-bold text-orange-500">No monthly</span>
                            <span className="text-sm text-gray-600 block">subscription</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-lg font-bold text-orange-500">No monthly</span>
                            <span className="text-sm text-gray-600 block">subscription</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-5">
                <p className="font-semibold text-gray-800 uppercase text-sm tracking-wider">ALL BASIC FEATURES PLUS:</p>

                {[
                  "Everything in Basic plan",
                  "Receive orders via WhatsApp",
                  "Admin dashboard for order tracking",
                  "Outside delivery orders via WhatsApp",
                  "Detailed Analytics",
                  "GST and other extra charges",
                  "Add charges in each table (AC/Non-AC, etc.)",
                  "Multi-location support"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="bg-orange-100 rounded-full p-1">
                      <Check className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700 group-hover:text-orange-600 transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="p-8 border-t border-gray-100 space-y-4 bg-gray-50">
                <Button
                  onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20the%20Pro%20plan.%20Can%20you%20share%20more%20details%20about%20this?", "_blank")}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
                >
                  Select Plan
                </Button>
                <Button
                  onClick={() => { 
                    navigate.push("/hotels/Al-Raidhan/373a15f9-9c58-4e34-ae07-b272e578928f")
                    window.scrollTo(0, 0);
                   }}
                  className="w-full bg-white hover:bg-orange-50 text-orange-500 border-2 border-orange-500 font-semibold py-3"
                >
                  View Demo
                </Button>
              </div>
            </div>

            {/* Max Plan */}
            <div className="bg-white rounded-2xl border-2 border-orange-500 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative">
              <div className="absolute -top-px right-0 left-0 mx-auto w-max bg-orange-500 text-white text-sm font-bold py-2 px-6 rounded-b-lg shadow-lg">
                MOST POPULAR
              </div>
              <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-orange-50 to-white">
                <h3 className="text-2xl font-bold text-gray-900">Max</h3>
                <div className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      {isIndianPricing ? (
                        <>
                          <span className="text-4xl font-bold text-orange-500">₹500</span>
                          <span className="text-lg text-gray-600">one-time setup fee</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-orange-500">$12</span>
                          <span className="text-lg text-gray-600">setup fee</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        {isIndianPricing ? (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">₹500</span>
                            <span className="text-sm text-gray-600 block">monthly</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">$12</span>
                            <span className="text-sm text-gray-600 block">monthly</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 border-2 border-orange-200 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                        {isIndianPricing ? (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">₹5000</span>
                            <span className="text-sm text-gray-600 block">yearly</span>
                            <span className="text-xs text-green-600">Save ₹1000</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <span className="text-2xl font-bold text-orange-500">$200</span>
                            <span className="text-sm text-gray-600 block">yearly</span>
                            <span className="text-xs text-green-600">Save $40</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* <div className="mt-4">
                    {isIndianPricing ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-orange-500">₹500</span>
                        <span className="text-lg text-gray-600">/month</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-orange-500">$20</span>
                        <span className="text-lg text-gray-600">/month</span>
                      </div>
                    )}
                  </div> */}
                  <div className="mt-4">
                    {isIndianPricing ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-orange-500">₹10</span>
                        <span className="text-lg text-gray-600">/delivery order</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-orange-500">$0.50</span>
                        <span className="text-lg text-gray-600">/delivery order</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-5">
                <p className="font-semibold text-gray-800 uppercase text-sm tracking-wider">ALL PRO FEATURES PLUS:</p>

                {[
                  "Everything in Pro plan",
                  "Inbuilt POS system",
                  "Captain ordering system",
                  "Table ordering system",
                  "KOT and KDS system",
                  "Automatic stock updation",
                  "Advanced reporting & analytics",
                  "Multi-location support"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className="bg-orange-100 rounded-full p-1">
                      <Check className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-gray-700 group-hover:text-orange-600 transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="p-8 border-t border-gray-100 space-y-4 bg-gray-50">
                <Button
                  onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20the%20Max%20plan%20with%20POS%20and%20table%20ordering.%20Can%20you%20share%20more%20details%20about%20this?", "_blank")}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
                >
                  Select Plan
                </Button>
                <Button
                  onClick={() => { 
                    navigate.push("/hotels/Al-Raidhan/373a15f9-9c58-4e34-ae07-b272e578928f")
                    window.scrollTo(0, 0);
                   }}
                  className="w-full bg-white hover:bg-orange-50 text-orange-500 border-2 border-orange-500 font-semibold py-3"
                >
                  View Demo
                </Button>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto mt-8 rounded-xl border border-gray-200 max-w-5xl mx-auto">
            <table className="min-w-full bg-white overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-900">Features</th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-gray-900">Basic</th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-gray-900">Pro</th>
                  <th className="py-4 px-6 text-center text-sm font-semibold text-gray-900">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Theme color customization</td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Menu customization</td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Reorder categories</td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium"> &quot;Must Try&quot; dishes</td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Google reviews integration</td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">WhatsApp ordering</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Order tracking dashboard</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Delivery orders via WhatsApp</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Table ordering system</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Inbuilt POS system</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Captain ordering system</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">KOT and KDS system</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-sm text-gray-800 font-medium">Automatic stock updation</td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><X className="h-5 w-5 text-gray-400 mx-auto" /></td>
                  <td className="py-3 px-6 text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-orange-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to transform your restaurant experience?</h2>
          <p className="text-xl text-orange-100 mb-8 max-w-3xl mx-auto">
            Join hundreds of restaurants already using our platform to streamline operations and delight customers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* <Button
              onClick={() => navigate.push("/partner")}
              className="bg-white hover:bg-orange-50 text-orange-600 px-8 py-6 text-lg rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Start Your Free Trial
            </Button> */}
            <Button
              onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20partnering%20with%20Cravings.%20Can%20you%20share%20the%20details", "_blank")}
              variant="outline"
              className="bg-transparent hover:bg-orange-500 text-white border border-white px-8 py-6 text-lg rounded-full transition-all duration-300"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
