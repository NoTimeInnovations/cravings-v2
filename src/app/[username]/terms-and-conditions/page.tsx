import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPartnerByUsername, getDisplayLegalName } from "@/lib/legalInfo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { TermsContent } from "@/components/legal/policyContent";

const SLUG = "terms-and-conditions";
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
    title: `Terms and Conditions — ${name}`,
    description: `Terms and Conditions for ${name}.`,
  };
}

export default async function TermsPage({
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
      title="Terms and Conditions"
      lastUpdated={LAST_UPDATED}
      currentSlug={SLUG}
    >
      <TermsContent partner={partner} />
    </LegalPageLayout>
  );
}
