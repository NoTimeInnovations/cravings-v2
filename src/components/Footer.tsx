"use client";

import React from "react";
import Link from "next/link";
import { Facebook, Instagram, Linkedin } from "lucide-react";

export default function Footer({
  appName = "Menuthere",
}: {
  appName?: string;
}) {
  return (
    <footer className="bg-terracotta-600 pt-16 pb-10 geist-font text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Column 1: Brand */}
          <div className="col-span-2">
            <h3 className="font-semibold text-white text-base mb-3">
              Menuthere
            </h3>
            <p className="text-sm text-white/70 max-w-xs leading-relaxed">
              The all-in-one platform for restaurants to manage digital menus,
              orders, and grow their business online.
            </p>
          </div>

          {/* Column 2: Solutions */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Solutions</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/product/digital-menu"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Digital Menu
                </Link>
              </li>
              <li>
                <Link
                  href="/product/table-ordering"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Table Ordering
                </Link>
              </li>
              <li>
                <Link
                  href="/product/captain-ordering"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Captain Ordering
                </Link>
              </li>
              <li>
                <Link
                  href="/product/delivery-website"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Delivery Website
                </Link>
              </li>
              <li>
                <Link
                  href="/product/pos"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  POS System
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/help-center"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/get-started"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-white/50">
            &copy; 2026 Menuthere. All rights reserved.
          </span>

          <div className="flex items-center gap-4">
            <Link
              href="https://www.instagram.com/menu.there/"
              className="text-white/50 hover:text-white transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </Link>
            <Link
              href="https://www.linkedin.com/company/Menuthere"
              className="text-white/50 hover:text-white transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </Link>
            <Link
              href="https://www.facebook.com/Menuthere"
              className="text-white/50 hover:text-white transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
