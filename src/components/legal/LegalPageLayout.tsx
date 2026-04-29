import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import type { LegalPartnerInfo } from "@/lib/legalInfo";
import { getDisplayLegalName } from "@/lib/legalInfo";

const POLICY_LINKS = [
  { href: "about-us", label: "About Us" },
  { href: "contact-us", label: "Contact Us" },
  { href: "terms-and-conditions", label: "Terms & Conditions" },
  { href: "privacy-policy", label: "Privacy Policy" },
  { href: "refund-and-cancellation-policy", label: "Refund & Cancellation" },
  { href: "shipping-and-delivery-policy", label: "Shipping & Delivery" },
];

interface Props {
  partner: LegalPartnerInfo;
  title: string;
  lastUpdated?: string;
  currentSlug: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  partner,
  title,
  lastUpdated,
  currentSlug,
  children,
}: Props) {
  const displayName = getDisplayLegalName(partner);
  const username = partner.username;
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href={`/${username}`}
            className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {partner.store_name}</span>
          </Link>
          <div className="text-right">
            <p className="text-sm font-semibold text-neutral-900">{displayName}</p>
            {partner.official_name && partner.official_name !== partner.store_name && (
              <p className="text-xs text-neutral-500">{partner.store_name}</p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Card className="border-neutral-200 shadow-sm">
          <CardContent className="px-5 py-8 sm:px-10 sm:py-12">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {displayName}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                {title}
              </h1>
              {lastUpdated && (
                <p className="mt-3 text-sm text-neutral-500">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>

            <Separator className="my-6 bg-neutral-200" />

            <article className="legal-content text-[15px] leading-7 text-neutral-700">
              {children}
            </article>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Policies & Information
          </p>
          <nav className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {POLICY_LINKS.map((link) => {
              const isActive = link.href === currentSlug;
              return (
                <Link
                  key={link.href}
                  href={`/${username}/${link.href}`}
                  className={`text-sm transition-colors ${
                    isActive
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <Separator className="my-6 bg-neutral-200" />
          <p className="text-xs text-neutral-500">
            &copy; {year} {displayName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
