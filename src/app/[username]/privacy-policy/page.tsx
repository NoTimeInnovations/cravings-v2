import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPartnerByUsername, getDisplayLegalName } from "@/lib/legalInfo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { PrivacyContent } from "@/components/legal/policyContent";

const SLUG = "privacy-policy";
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
    title: `Privacy Policy — ${name}`,
    description: `Privacy Policy for ${name}.`,
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const partner = await getLegalPartnerByUsername(username);
  if (!partner) notFound();

  return (
    <LegalPageLayout
      partner={partner}
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      currentSlug={SLUG}
    >
      <PrivacyContent partner={partner} />
    </LegalPageLayout>
  );
}
