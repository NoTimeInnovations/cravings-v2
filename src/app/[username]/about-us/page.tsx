import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getLegalPartnerByUsername,
  getBrandName,
  getLegalName,
  hasDistinctLegalName,
} from "@/lib/legalInfo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const SLUG = "about-us";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const partner = await getLegalPartnerByUsername(username);
  if (!partner) return { title: "Not Found" };
  const name = getBrandName(partner);
  return {
    title: `About Us — ${name}`,
    description: `Learn more about ${name}.`,
  };
}

export default async function AboutUsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const partner = await getLegalPartnerByUsername(username);
  if (!partner) notFound();

  const aboutText = partner.about_us?.trim();
  const name = getBrandName(partner);

  return (
    <LegalPageLayout partner={partner} title="About Us" currentSlug={SLUG}>
      {aboutText ? (
        aboutText.split(/\n\s*\n/).map((para, idx) => (
          <p key={idx} className="mb-4 whitespace-pre-line">
            {para.trim()}
          </p>
        ))
      ) : (
        <p className="mb-4">
          Welcome to {name}. We are committed to bringing you a delightful
          dining experience through carefully crafted dishes, quality
          ingredients, and attentive service. Browse our menu to explore our
          offerings, and feel free to reach out if you would like to know
          more about us.
        </p>
      )}
      {hasDistinctLegalName(partner) && (
        <p className="mb-4 text-sm text-neutral-500">
          {name} is a brand owned and operated by {getLegalName(partner)}.
        </p>
      )}
    </LegalPageLayout>
  );
}
