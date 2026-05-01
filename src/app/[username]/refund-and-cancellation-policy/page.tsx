import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPartnerByUsername, getDisplayLegalName } from "@/lib/legalInfo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { RefundContent } from "@/components/legal/policyContent";

const SLUG = "refund-and-cancellation-policy";
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
    title: `Refund and Cancellation Policy — ${name}`,
    description: `Refund and Cancellation Policy for ${name}.`,
  };
}

export default async function RefundPage({
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
      title="Refund and Cancellation Policy"
      lastUpdated={LAST_UPDATED}
      currentSlug={SLUG}
    >
      <RefundContent partner={partner} />
    </LegalPageLayout>
  );
}
