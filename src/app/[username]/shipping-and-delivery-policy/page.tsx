import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalPartnerByUsername, getDisplayLegalName } from "@/lib/legalInfo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { ShippingContent } from "@/components/legal/policyContent";

const SLUG = "shipping-and-delivery-policy";
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
    title: `Shipping and Delivery Policy — ${name}`,
    description: `Shipping and Delivery Policy for ${name}.`,
  };
}

export default async function ShippingPage({
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
      title="Shipping and Delivery Policy"
      lastUpdated={LAST_UPDATED}
      currentSlug={SLUG}
    >
      <ShippingContent partner={partner} />
    </LegalPageLayout>
  );
}
