import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerStorefrontByUsernameQuery } from "@/api/partners";
import { getMenu } from "@/api/menu";
import { StorefrontConfig } from "@/types/storefront";
import StorefrontPage from "@/screens/StorefrontPage";
import { Button } from "@/components/ui/button";

interface PartnerRow {
  id: string;
  username: string;
  store_name: string;
  store_banner?: string;
  description?: string;
  phone?: string;
  location?: string;
  location_details?: string;
  storefront_config: StorefrontConfig | null;
}

async function fetchPartner(username: string): Promise<PartnerRow | null> {
  try {
    const data = await fetchFromHasura(getPartnerStorefrontByUsernameQuery, {
      username,
    });
    return (data?.partners?.[0] as PartnerRow) ?? null;
  } catch (err) {
    console.error("Error fetching storefront partner:", err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const partner = await fetchPartner(username);
  if (!partner) return { title: "Not Found" };

  const cfg = partner.storefront_config;
  const title =
    cfg?.seo?.meta_title || `${partner.store_name} — Order Online`;
  const description =
    cfg?.seo?.meta_description ||
    partner.description ||
    `${partner.store_name} — order online`;
  const image = partner.store_banner || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const partner = await fetchPartner(username);

  if (!partner) notFound();

  const config = partner.storefront_config;

  if (!config?.enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-background">
        <h1 className="text-4xl font-bold">{partner.store_name}</h1>
        <p className="text-muted-foreground mt-4 text-lg max-w-md">
          Our new website is coming soon.
        </p>
        <Button className="mt-8" asChild>
          <Link href={`/${username}`}>View Our Menu</Link>
        </Button>
      </div>
    );
  }

  const hasFeatured = config.sections.some(
    (s) => s.type === "featured_items" && s.enabled,
  );
  const menuRes = hasFeatured
    ? await fetchFromHasura(getMenu, { partner_id: partner.id })
    : null;

  return (
    <StorefrontPage
      partner={partner}
      config={config}
      menuItems={menuRes?.menu ?? []}
    />
  );
}
