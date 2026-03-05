/**
 * Fetch menu items from Apparys partner account for specific categories
 * and save as sample menu data.
 *
 * Usage: npx tsx scripts/fetch-apparys-menu.ts
 */

const HASURA_ENDPOINT =
  "https://hasura-prod-v2.cravings.live/v1/graphql";
const HASURA_ADMIN_SECRET =
  "grK3WUtZW9mXGtYtjEqU44QfmFkWOMga9qQoa1uBvR03n7DXLkTodHH9cWDcN6cn";

const TARGET_CATEGORIES = ["cold_drinks", "mandi", "Dosa Specials", "Noodles"];

// Words/phrases to strip from item names (case-insensitive)
const STRIP_PATTERNS = [/apparys?\s*special/gi, /appar[yi]s?\s*/gi];

function cleanName(name: string): string {
  let cleaned = name;
  for (const pattern of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  // Clean up extra whitespace and leading/trailing spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  // Remove leading/trailing dashes, hyphens after cleanup
  cleaned = cleaned.replace(/^[\s\-–]+|[\s\-–]+$/g, "").trim();
  return cleaned;
}

interface MenuItem {
  name: string;
  price: number;
  description: string;
  category: string;
  image?: string;
  variants?: { name: string; price: number }[];
  is_veg?: boolean;
}

async function main() {
  // Step 1: Find Apparys partner by username
  const partnerQuery = `
    query {
      partners(where: { username: { _eq: "apparys" } }) {
        id
        store_name
        username
      }
    }
  `;

  const partnerRes = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query: partnerQuery }),
  });

  const partnerData = await partnerRes.json();
  const partner = partnerData?.data?.partners?.[0];

  if (!partner) {
    console.error("Partner 'apparys' not found!");
    process.exit(1);
  }

  console.log(`Found partner: ${partner.store_name} (${partner.id})`);

  // Step 2: Fetch their menu
  const menuQuery = `
    query GetMenu($partner_id: uuid!) {
      menu(where: { partner_id: { _eq: $partner_id }, deletion_status: { _eq: 0 } }) {
        name
        price
        description
        image_url
        is_veg
        variants
        category {
          name
        }
      }
    }
  `;

  const menuRes = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: menuQuery,
      variables: { partner_id: partner.id },
    }),
  });

  const menuData = await menuRes.json();
  const allItems = menuData?.data?.menu;

  if (!allItems || allItems.length === 0) {
    console.error("No menu items found!");
    process.exit(1);
  }

  console.log(`Total menu items: ${allItems.length}`);

  // Step 3: Filter by target categories and transform
  const sampleItems: MenuItem[] = [];

  for (const item of allItems) {
    const categoryName = item.category?.name;
    if (!categoryName || !TARGET_CATEGORIES.includes(categoryName)) continue;

    // Map DB category names to display names
    const CATEGORY_DISPLAY: Record<string, string> = {
      cold_drinks: "cold-drinks",
      mandi: "mandi",
      "Dosa Specials": "dosa-special",
      Noodles: "noodles",
    };

    const cleaned: MenuItem = {
      name: cleanName(item.name),
      price: item.price,
      description: item.description || "",
      category: CATEGORY_DISPLAY[categoryName] || categoryName.toLowerCase().replace(/\s+/g, "-"),
      is_veg: item.is_veg ?? undefined,
    };

    if (item.image_url) {
      cleaned.image = item.image_url;
    }

    if (item.variants && Array.isArray(item.variants) && item.variants.length > 0) {
      cleaned.variants = item.variants.map((v: any) => ({
        name: v.name,
        price: v.price,
      }));
    }

    sampleItems.push(cleaned);
  }

  console.log(`Filtered items (${TARGET_CATEGORIES.join(", ")}): ${sampleItems.length}`);

  // Step 4: Write to JSON file
  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(__dirname, "..", "src", "data", "sampleMenu.json");
  fs.writeFileSync(outPath, JSON.stringify(sampleItems, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(console.error);
