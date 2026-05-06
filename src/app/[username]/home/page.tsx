import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerStorefrontByUsernameQuery } from "@/api/partners";
import { getMenu } from "@/api/menu";
import { WebsiteConfig, mergeWebsiteConfig } from "@/types/website";
import WebsitePage from "@/screens/WebsitePage";
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
  geo_location?: { type?: string; coordinates?: [number, number] } | null;
  website_config?: any;
  storefront_settings?: any;
  social_links?: any;
  currency?: string;
  country?: string;
  country_code?: string;
  theme?: any;
}

function parseJson(raw: any): any {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

function getWebsiteConfig(partner: PartnerRow): WebsiteConfig {
  const direct = parseJson(partner.website_config);
  if (direct) return mergeWebsiteConfig(direct);
  // Backward compat: previously stored under storefront_settings.website
  const settings = parseJson(partner.storefront_settings) || {};
  return mergeWebsiteConfig(settings.website || null);
}

async function fetchPartner(username: string): Promise<PartnerRow | null> {
  try {
    const data = await fetchFromHasura(getPartnerStorefrontByUsernameQuery, {
      username,
    });
    return (data?.partners?.[0] as PartnerRow) ?? null;
  } catch (err) {
    console.error("Error fetching website partner:", err);
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

  const title = `${partner.store_name} — Order Online`;
  const description =
    partner.description || `${partner.store_name} — order online`;
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

  const config = getWebsiteConfig(partner);

  if (!config.enabled) {
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

  const menuRes = config.menu.enabled
    ? await fetchFromHasura(getMenu, { partner_id: partner.id })
    : null;

  return (
    <WebsitePage
      partner={partner}
      config={config}
      menuItems={menuRes?.menu ?? []}
    />
  );
}
