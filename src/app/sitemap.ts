import { MetadataRoute } from "next";
import { fetchFromHasura } from "@/lib/hasuraClient";

const BASE_URL = "https://menuthere.com";

const getAllActivePartnersForSitemap = `
  query GetAllActivePartnersForSitemap {
    partners(where: {status: {_eq: "active"}}) {
      id
      store_name
    }
  }
`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all active partners for hotel pages
  let hotelEntries: MetadataRoute.Sitemap = [];
  try {
    const data = await fetchFromHasura(getAllActivePartnersForSitemap);
    const partners: { id: string; store_name: string }[] =
      data?.partners || [];

    hotelEntries = partners.map((partner) => {
      const slug = encodeURIComponent(
        partner.store_name.replace(/\s+/g, "-")
      );
      return {
        url: `${BASE_URL}/hotels/${slug}/${partner.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });
  } catch (error) {
    console.error("Failed to fetch partners for sitemap:", error);
  }

  return [
    // Home
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Solutions - Featured
    {
      url: `${BASE_URL}/solutions/google-business`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Solutions - Roles
    {
      url: `${BASE_URL}/solutions/owners`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/solutions/agencies`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Solutions - Industries
    {
      url: `${BASE_URL}/solutions/restaurants`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/cafes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/bakeries`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/cloud-kitchens`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/hotels`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/food-trucks`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/bars`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/solutions/catering`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Resources
    {
      url: `${BASE_URL}/help-center`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/download-app`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Pricing
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Hotel pages (dynamic)
    ...hotelEntries,
  ];
}
