"use client";
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Check, ChevronRight, Star, FileText } from "lucide-react";
import Image from "next/image";

export default function HomePageIntranational() {
  // Restaurants sample (keeps trust signals)
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

  // Duplicate to create seamless marquee
  const duplicated = [...restaurants, ...restaurants, ...restaurants];
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let pos = 0;
    const step = () => {
      if (!scrollRef.current) return;
      pos -= 0.6; // speed
      if (pos <= -1500) pos = 0;
      scrollRef.current.style.transform = `translateX(${pos}px)`;
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  return (
    <div className="min-h-screen w-full font-sans">
      {/* HERO */}
      <header className="bg-gradient-to-b from-orange-50 to-orange-100 py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <UtensilsCrossed className="h-8 w-8 text-orange-600" />
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-orange-100 text-orange-700">Cravings — Digital Menu</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
              The Smartest Digital Menu for Modern Restaurants
            </h1>

            <p className="text-lg text-gray-700 mb-6 max-w-2xl">
              Edit your menu in seconds. Add specials, toggle availability, post offers and share a beautiful QR menu — no apps, no PDFs, no headache.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              <Button
                onClick={() => window.open("https://buy.stripe.com/test_XXXXXXXX", "_blank")}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full text-lg shadow"
              >
                Start Free Trial — $25/mo
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I'm%20interested%20in%20Cravings%20Digital%20Menu", "_blank")}
                className="border-orange-600 text-orange-600 px-6 py-3 rounded-full"
              >
                Book a Demo
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="-space-x-2 flex">
                {restaurants.slice(0, 4).map((r, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-white overflow-hidden">
                    <Image src={r.logo} alt={r.name} width={40} height={40} className="object-cover w-full h-full" />
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                <strong>400+</strong> restaurants trust Cravings
              </div>
            </div>
          </div>

          <div className="hidden lg:block flex-1 relative">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-white bg-white">
              <Image src="/placeholder-menu-qr.jpg" alt="Digital menu" width={880} height={520} className="w-full h-auto" />
            </div>
            <div className="absolute -bottom-6 right-6 p-3 bg-white rounded-lg shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 text-yellow-400" />)}</div>
                <div className="font-medium">4.9</div>
                <div className="text-gray-500">Customer rating</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logos Marquee */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500 mb-6">Trusted by restaurants</p>
          <div className="overflow-hidden">
            <div className="flex" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
              <div ref={scrollRef} className="flex transition-transform will-change-transform">
                {duplicated.map((r, i) => (
                  <a href={r.url} key={i} rel="noreferrer" target="_blank" className="mx-3">
                    <div className="bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-center h-28 w-44">
                      <Image src={r.logo} alt={r.name} width={140} height={64} className="object-contain" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Everything you need for a beautiful digital menu</h2>
            <p className="text-gray-600 mt-2">Fast edits, elegant design, and powerful simple features to keep customers coming back.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Menu Editing</h3>
              <p className="text-gray-600 mb-4">Add, remove or reorder items in seconds — no designers, no uploads.</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Real-time menu updates</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Visual dish images</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Drag & drop sections</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Offers & Specials</h3>
              <p className="text-gray-600 mb-4">Promote limited-time offers or "today's special" directly on your menu.</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Create time-limited offers</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Highlight special dishes</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Simple offer scheduling</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Availability Control</h3>
              <p className="text-gray-600 mb-4">Mark items as "sold out" or "available" with one tap and keep customers informed.</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Toggle availability instantly</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Auto-hide sold-out items</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Reduce order errors</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">How it works</h2>
          <p className="text-gray-600 mb-8">Set up your menu in three simple steps.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold mb-2">1</div>
              <h4 className="font-semibold mb-2">Create Account</h4>
              <p className="text-gray-600">Sign up and choose your menu template — no coding required.</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold mb-2">2</div>
              <h4 className="font-semibold mb-2">Build Your Menu</h4>
              <p className="text-gray-600">Add categories, photos, prices and specials — instant preview included.</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold mb-2">3</div>
              <h4 className="font-semibold mb-2">Share & Update</h4>
              <p className="text-gray-600">Share your QR code, update items anytime and track views with built-in analytics.</p>
            </div>
          </div>

          <div className="mt-8">
            <Button onClick={() => window.open("https://buy.stripe.com/test_XXXXXXXX", "_blank")} className="bg-orange-600 text-white px-6 py-3 rounded-full">Start your free trial</Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-orange-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Simple pricing — everything included</h2>
          <p className="text-gray-600 mb-8">One plan. No surprises. Cancel anytime.</p>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <div className="text-lg text-gray-600">Standard</div>
                <div className="text-4xl font-extrabold text-orange-600">$25<span className="text-base font-medium text-gray-600">/month</span></div>
                <div className="text-sm text-gray-600 mt-2">Editable menus, offers, availability, branding and QR codes.</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => window.open("https://buy.stripe.com/test_XXXXXXXX", "_blank") } className="bg-orange-600 text-white px-6 py-3 rounded-full">Get started — $25/mo</Button>
                <Button variant="outline" onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I%27m%20interested%20in%20Cravings%20Digital%20Menu", "_blank") } className="border-orange-600 text-orange-600 px-6 py-3 rounded-full">Book a demo</Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                "Unlimited menu updates",
                "Availability toggles",
                "Specials & offers",
                "Branded QR code",
                "Image uploads",
                "Basic analytics (views)"
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-700">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <footer className="bg-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to modernize your menu?</h3>
          <p className="text-gray-600 mb-6">Start your free trial today and see how fast menu updates can drive happy customers.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => window.open("https://buy.stripe.com/test_XXXXXXXX", "_blank") } className="bg-orange-600 text-white px-6 py-3 rounded-full">Start Free Trial</Button>
            <Button variant="outline" onClick={() => window.open("https://wa.me/918590115462?text=Hi!%20I%27m%20interested%20in%20Cravings%20Digital%20Menu", "_blank") } className="border-orange-600 text-orange-600 px-6 py-3 rounded-full">Contact Sales</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
