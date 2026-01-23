"use client";

import React from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Github, Globe } from "lucide-react";

export default function Footer({ appName = "Cravings" }: { appName?: string }) {
    return (
        <footer className="bg-[#C04812] pt-20 pb-12 font-sans text-white relative overflow-hidden">
            {/* Grid Pattern (White for dark background) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-16">
                    {/* Column 1: Products */}
                    <div className="col-span-2 md:col-span-2 lg:col-span-2">
                        <h3 className="font-bold text-white mb-6 text-lg">{appName}</h3>
                        <p className="text-orange-100 mb-6 max-w-sm leading-relaxed">
                            The all-in-one platform for restaurants to manage digital menus, orders, and growing their business online.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* App Store Button - Constructed (White version) */}
                            <Link href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors w-fit min-w-[170px]">
                                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.48C2.7 15.25 3.51 7.59 10.2 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.89 3.51-.84 1.54.06 2.68.75 3.37 1.9-3 1.91-2.47 5.86.58 7.35-.61 1.75-1.53 3.07-2.69 4.08h-.01zM13 6.6c.14-1.8 1.48-3.37 2.96-3.6.43 2.27-2.3 3.96-2.96 3.6z" />
                                </svg>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase font-medium text-gray-600">Download on the</span>
                                    <span className="text-lg font-bold">App Store</span>
                                </div>
                            </Link>

                            {/* Play Store Button - Constructed (White version) */}
                            <Link href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors w-fit min-w-[170px]">
                                <svg className="w-7 h-7 fill-current ml-1" viewBox="0 0 24 24">
                                    <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85M16.81,8.88L14.54,11.15L6.05,2.66M18.59,10.59L19.53,11.13C20.1,11.45 20.1,12.55 19.53,12.87L18.59,13.41L15.39,12L18.59,10.59Z" />
                                </svg>
                                <div className="flex flex-col items-start leading-none ml-1">
                                    <span className="text-[10px] uppercase font-medium text-gray-600">Get it on</span>
                                    <span className="text-lg font-bold">Google Play</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Column 2: Products */}
                    <div>
                        <h4 className="font-semibold text-white mb-6">Products</h4>
                        <ul className="space-y-4">
                            <li><Link href="/product/digital-menu" className="text-orange-100 hover:text-white transition-colors hover:underline">Digital Menu</Link></li>
                            <li><Link href="/product/delivery-website" className="text-orange-100 hover:text-white transition-colors hover:underline">Own Delivery Website</Link></li>
                            <li><Link href="/product/pos" className="text-orange-100 hover:text-white transition-colors hover:underline">POS System</Link></li>
                            <li><Link href="/product/table-ordering" className="text-orange-100 hover:text-white transition-colors hover:underline">Table Ordering</Link></li>
                            <li><Link href="/product/captain-ordering" className="text-orange-100 hover:text-white transition-colors hover:underline">Captain Ordering</Link></li>
                            {/* <li><Link href="/product/inventory-management" className="text-orange-100 hover:text-white transition-colors hover:underline">Inventory</Link></li> */}
                            {/* <li><Link href="/product/marketing" className="text-orange-100 hover:text-white transition-colors hover:underline">Marketing Tools</Link></li> */}
                        </ul>
                    </div>

                    {/* Column 3: Resources */}
                    <div>
                        <h4 className="font-semibold text-white mb-6">Resources</h4>
                        <ul className="space-y-4">
                            {/* <li><Link href="/blogs" className="text-orange-100 hover:text-white transition-colors hover:underline">Blog</Link></li> */}
                            <li><Link href="/help-center" className="text-orange-100 hover:text-white transition-colors hover:underline">Help Center</Link></li>
                            {/* <li><Link href="/case-studies" className="text-orange-100 hover:text-white transition-colors hover:underline">Case Studies</Link></li> */}
                            {/* <li><Link href="/guides" className="text-orange-100 hover:text-white transition-colors hover:underline">Guides</Link></li> */}
                        </ul>
                    </div>

                    {/* Column 4: Company */}
                    {/* <div>
                        <h4 className="font-semibold text-white mb-6">Company</h4>
                        <ul className="space-y-4">
                            {/* <li><Link href="/about-us" className="text-orange-100 hover:text-white transition-colors hover:underline">About Us</Link></li> */}
                    {/* <li><Link href="/careers" className="text-orange-100 hover:text-white transition-colors hover:underline">Careers</Link></li> */}
                    {/* <li><Link href="/contact" className="text-orange-100 hover:text-white transition-colors hover:underline">Contact</Link></li> */}
                    {/* <li><Link href="/partners" className="text-orange-100 hover:text-white transition-colors hover:underline">Partners</Link></li> */}
                    {/* </ul> */}
                    {/* </div>  */}

                    {/* Column 5: Legal */}
                    <div>
                        <h4 className="font-semibold text-white mb-6">Legal</h4>
                        <ul className="space-y-4">
                            <li><Link href="/privacy-policy" className="text-orange-100 hover:text-white transition-colors hover:underline">Privacy Policy</Link></li>
                            <li><Link href="/terms-and-conditions" className="text-orange-100 hover:text-white transition-colors hover:underline">Terms of Service</Link></li>
                            <li><Link href="/refund-policy" className="text-orange-100 hover:text-white transition-colors hover:underline">Refund Policy</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/40 flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Copyright & Language */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* <select className="bg-transparent border border-white/30 rounded-md px-3 py-1.5 text-sm text-white/90 focus:outline-none focus:border-white cursor-pointer [&>option]:text-gray-900">
                            <option>English</option>
                            <option>Español</option>
                            <option>Français</option>
                        </select> */}
                        <span className="text-sm text-orange-100/80">© 2026 {appName}. All rights reserved.</span>
                    </div>

                    {/* Branding / Tagline */}
                    <div className="hidden md:block">
                        <span className="text-sm font-medium text-orange-200 italic">Designed for modern hospitality</span>
                    </div>

                    {/* Social Icons */}
                    <div className="flex items-center gap-5">
                        <Link href="https://www.instagram.com/cravings.live/" className="text-orange-200 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></Link>
                        {/* <Link href="#" className="text-orange-200 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></Link> */}
                        <Link href="https://www.linkedin.com/company/notime-edu/" className="text-orange-200 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></Link>
                        <Link href="https://www.facebook.com/share/1GwAyvArT8/" className="text-orange-200 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
