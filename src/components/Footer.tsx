"use client";

import { useT } from "@/lib/i18n/LocaleProvider";

import React from "react";
import Image from "next/image";
import Link from "next/link";

import { Facebook, Instagram, Linkedin } from "lucide-react";

export default function Footer({
  appName = "Menuthere",
}: {
  appName?: string;
}) {
  const { t } = useT();
  return (
    <footer className="bg-orange-600 pt-16 md:pt-24 pb-10 geist-font text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Column 1: Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-3">
              <Image
                src="/menuthere-logo-full-new-white.svg"
                alt="Menuthere"
                width={201}
                height={46}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-white/80 max-w-xs leading-relaxed">
              {t.footerLinks.brandBlurb}
            </p>
          </div>

          {/* Column 2: Solutions */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">{t.footer.solutions}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/solutions/google-business"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.solutionsGoogleBusinessSync}
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/owners"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.solutionsOwners}
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/agencies"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.solutionsAgencies}
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/petpooja"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.solutionsPetpoojaIntegration}
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/restaurants"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.solutionsRestaurants}
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/cafes"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.solutionsCafes}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">{t.footer.resources}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/help-center"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.resourcesHelpCenter}
                </Link>
              </li>
              <li>
                <Link
                  href="/download-app"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.resourcesDownloadApp}
                </Link>
              </li>
              {/* TEMPORARILY HIDDEN for iOS App Store review (Guideline 3.1.1 - IAP). Re-enable after approval. */}
              {/* <li>
                <Link
                  href="/pricing"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li> */}
              <li>
                <Link
                  href="/get-started"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.resourcesGetStarted}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="font-semibold text-white text-sm mb-4">{t.footer.legal}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.legalPrivacyPolicy}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.legalTermsOfService}
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-sm text-white/80 hover:text-white transition-colors"
                >
                  {t.footerLinks.legalRefundPolicy}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-white/80">
            {t.footerLinks.copyright} {t.footer.rights}
          </span>

          <div className="flex items-center gap-4">
            <Link
              href="https://www.instagram.com/menu.there/"
              className="text-white/80 hover:text-white transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </Link>
            <Link
              href="https://www.linkedin.com/company/Menuthere"
              className="text-white/80 hover:text-white transition-colors"
            >
              <Linkedin className="w-4 h-4" />
            </Link>
            <Link
              href="https://www.facebook.com/Menuthere"
              className="text-white/80 hover:text-white transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
