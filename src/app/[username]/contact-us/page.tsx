import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getLegalPartnerByUsername,
  getDisplayLegalName,
  getContactEmail,
  getContactPhone,
} from "@/lib/legalInfo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { Mail, Phone, MapPin, Building2 } from "lucide-react";

const SLUG = "contact-us";
const LAST_UPDATED = "29 April 2026";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const partner = await getLegalPartnerByUsername(username);
  if (!partner) return { title: "Not Found" };
  const name = getDisplayLegalName(partner);
  return {
    title: `Contact Us — ${name}`,
    description: `Get in touch with ${name}.`,
  };
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
        <Icon className="h-5 w-5 text-neutral-700" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <p className="mt-0.5 break-words text-base text-neutral-900">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
      >
        {inner}
      </a>
    );
  }
  return (
    <div className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4">
      {inner}
    </div>
  );
}

export default async function ContactUsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const partner = await getLegalPartnerByUsername(username);
  if (!partner) notFound();

  const name = getDisplayLegalName(partner);
  const email = getContactEmail(partner);
  const phone = getContactPhone(partner);
  const address = partner.operating_address?.trim();

  return (
    <LegalPageLayout
      partner={partner}
      title="Contact Us"
      lastUpdated={LAST_UPDATED}
      currentSlug={SLUG}
    >
      <p className="mb-6">You may contact us using the information below:</p>

      <div className="grid gap-3 not-prose">
        <ContactRow
          icon={Building2}
          label="Merchant Legal Entity Name"
          value={name}
        />
        {address && (
          <ContactRow
            icon={MapPin}
            label="Registered Address"
            value={address}
          />
        )}
        {address && (
          <ContactRow
            icon={MapPin}
            label="Operational Address"
            value={address}
          />
        )}
        {phone && (
          <ContactRow
            icon={Phone}
            label="Telephone No"
            value={phone}
            href={`tel:${phone}`}
          />
        )}
        {email && (
          <ContactRow
            icon={Mail}
            label="E-Mail ID"
            value={email}
            href={`mailto:${email}`}
          />
        )}
      </div>

      {!address && !email && !phone && (
        <p className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-neutral-600">
          Contact details for this business have not been provided yet.
        </p>
      )}
    </LegalPageLayout>
  );
}
