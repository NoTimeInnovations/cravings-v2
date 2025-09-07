// app/hotels/sitemap.ts
import { MetadataRoute } from "next";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getAllPartnersQuery } from "@/api/partners";
import { Partner } from "@/store/authStore";

const BASE_URL = "https://www.cravings.live";
const ITEMS_PER_SITEMAP = 5000; // Adjust based on your needs

export async function generateSitemaps() {
  // Get total count of active partners
  const data = await fetchFromHasura(getAllPartnersQuery, {
    limit: 1,
    offset: 0,
  });

  const totalCount = data.partners_aggregate.aggregate.count;
  const sitemapCount = Math.ceil(totalCount / ITEMS_PER_SITEMAP);

  return Array.from({ length: sitemapCount }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const offset = id * ITEMS_PER_SITEMAP;

  // Fetch partners for this sitemap chunk
  const data = await fetchFromHasura(getAllPartnersQuery, {
    limit: ITEMS_PER_SITEMAP,
    offset: offset,
  });

  // Static pages
  const staticPages = [
    // Main hotels page
    {
      url: `${BASE_URL}/hotels`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    // Offers page
    {
      url: `${BASE_URL}/offers`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    // Explore page
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },

  ];

  // Generate partner URLs in the format /hotels/partner.store_name/partner.id
  const partnerPages = data.partners.map((partner: Partner) => {
    // Clean the store_name for URL (remove special chars, spaces, etc.)
    const cleanStoreName = partner.store_name
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single
      .trim();

    return {
      url: `${BASE_URL}/hotels/${cleanStoreName}/${partner.id}`,
      lastModified: new Date(), // Or use partner.updated_at if available
      changeFrequency: "weekly" as const,
      priority: 0.9,
    };
  });

  return [...staticPages, ...partnerPages];
}