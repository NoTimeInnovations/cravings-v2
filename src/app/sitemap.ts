import { MetadataRoute } from "next";
import { fetchFromHasura } from "@/lib/hasuraClient";

const BASE_URL = "https://menuthere.com";

// Slugs that indicate test/placeholder accounts — exclude from sitemap
const TEST_SLUGS = new Set(["sample", "newtest", "test", "demo", "testhotel", "new", "testingonboarding"]);

const getPartnersWithUsername = `
  query GetPartnersWithUsername {
    partners(where: {status: {_eq: "active"}, username: {_is_null: false, _neq: ""}}) {
      username
    }
  }
`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch active partners that have a username set
  let hotelEntries: MetadataRoute.Sitemap = [];
  try {
    const data = await fetchFromHasura(getPartnersWithUsername);
    const partners: { username: string }[] = data?.partners || [];

    hotelEntries = partners
      .filter((partner) => {
        const slug = partner.username.toLowerCase().trim();
        return !TEST_SLUGS.has(slug) && slug.length > 1;
      })
      .map((partner) => ({
        url: `${BASE_URL}/${partner.username}`,
        lastModified: new Date("2026-02-22"),
      }));
  } catch (error) {
    console.error("Failed to fetch partners for sitemap:", error);
  }

  const staticDate = new Date("2026-02-22");

  return [
    // Home
    { url: BASE_URL, lastModified: staticDate },
    // Get Started — conversion page
    { url: `${BASE_URL}/get-started`, lastModified: staticDate },
    // Pricing
    { url: `${BASE_URL}/pricing`, lastModified: staticDate },
    // Solutions - Featured
    { url: `${BASE_URL}/solutions/google-business`, lastModified: staticDate },
    // Solutions - Roles
    { url: `${BASE_URL}/solutions/owners`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/agencies`, lastModified: staticDate },
    // Solutions - Industries
    { url: `${BASE_URL}/solutions/restaurants`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/cafes`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/bakeries`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/cloud-kitchens`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/hotels`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/food-trucks`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/bars`, lastModified: staticDate },
    { url: `${BASE_URL}/solutions/catering`, lastModified: staticDate },
    // Comparisons
    { url: `${BASE_URL}/compare`, lastModified: staticDate },
    { url: `${BASE_URL}/compare/menuthere-vs-mydigimenu`, lastModified: staticDate },
    { url: `${BASE_URL}/compare/menuthere-vs-yumm`, lastModified: staticDate },
    { url: `${BASE_URL}/compare/menuthere-vs-thedigitalmenu`, lastModified: staticDate },
    { url: `${BASE_URL}/compare/menuthere-vs-menutiger`, lastModified: staticDate },
    // Resources
    { url: `${BASE_URL}/help-center`, lastModified: staticDate },
    { url: `${BASE_URL}/download-app`, lastModified: staticDate },
    // Restaurant pages — only partners with a username, served at /{username}
    ...hotelEntries,
  ];
}
