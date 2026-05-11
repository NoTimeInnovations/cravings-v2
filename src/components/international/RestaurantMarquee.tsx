import React from "react";
import Image from "next/image";
import { EXCLUDED_PARTNER_IDS } from "@/app/api/stats/_excluded";

interface Restaurant {
  url: string;
  name: string;
  logo: string;
}

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

const TOP_PARTNERS_QUERY = `
  query TopOrderingPartners($excluded: [uuid!]!) {
    partners(
      where: {
        id: { _nin: $excluded },
        store_banner: { _is_null: false, _neq: "" },
        orders: {}
      }
      order_by: { orders_aggregate: { count: desc } }
      limit: 10
    ) {
      id
      name
      store_name
      username
      store_banner
    }
  }
`;

async function fetchTopRestaurants(): Promise<Restaurant[]> {
  if (!HASURA_ENDPOINT || !HASURA_SECRET) return [];
  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": HASURA_SECRET,
      },
      body: JSON.stringify({
        query: TOP_PARTNERS_QUERY,
        variables: { excluded: EXCLUDED_PARTNER_IDS },
      }),
      // Refresh once an hour — keeps the marquee responsive to live volume
      // without hammering Hasura on every landing-page render.
      next: { revalidate: 3600 },
    });
    const json = await res.json();
    const partners = json?.data?.partners ?? [];
    return partners
      .filter((p: any) => p.id && p.store_banner)
      .map((p: any) => ({
        url: p.username
          ? `https://menuthere.com/${p.username}`
          : `https://menuthere.com/hotels/${p.id}`,
        name: p.store_name || p.name || "Restaurant",
        logo: p.store_banner,
      }));
  } catch (e) {
    console.error("RestaurantMarquee: failed to fetch top partners", e);
    return [];
  }
}

export default async function RestaurantMarquee() {
  const restaurants = await fetchTopRestaurants();
  if (restaurants.length === 0) return null;

  // Duplicate for seamless loop
  const duplicated = [...restaurants, ...restaurants];

  return (
    <div className="overflow-hidden max-w-[70%] mx-auto my-20 ">
      <div
        className="flex"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div
          className="flex animate-marquee will-change-transform"
          style={{ animationDuration: "40s" }}
        >
          {duplicated.map((r, i) => (
            <a
              href={r.url}
              key={i}
              rel="noreferrer"
              target="_blank"
              className="mx-8 flex-shrink-0"
            >
              <div className="flex items-center justify-center h-24 w-24 bg-white rounded-full p-2 shadow-sm overflow-hidden relative border border-gray-100">
                <Image
                  src={r.logo}
                  alt={r.name}
                  fill
                  sizes="96px"
                  unoptimized
                  className="object-cover hover:scale-110 transition-transform duration-300 grayscale contrast-70 hover:contrast-100 hover:grayscale-0"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
