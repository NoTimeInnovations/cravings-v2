"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { searchGoogleImagesBatch } from "@/lib/imageSearch/apify";
import { TELEVERY_ROLE } from "@/lib/televery";

/**
 * Bulk image lookup for the Add-a-restaurant menu step.
 *
 * Wraps the Apify Google-images search, which is server-only (it reads
 * APIFY_API_TOKEN) and therefore cannot be called from the panel directly.
 * Batched on purpose: the actor accepts an array of queries, so one round-trip
 * covers the whole menu instead of the previous call-per-item loop.
 *
 * Auth-gated because every call spends Apify credits — an open endpoint here
 * would be a free image-search API for anyone who found it.
 *
 * Returns the best (first-ranked) usable image per query. Queries with no
 * result are simply absent from the map.
 */
export async function searchMenuItemImages(
  queries: string[],
): Promise<Record<string, string>> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== TELEVERY_ROLE) {
    throw new Error("Not authorised.");
  }

  const cleaned = Array.from(
    new Set((queries || []).map((q) => (q || "").trim()).filter(Boolean)),
  );
  if (!cleaned.length) return {};

  const found = await searchGoogleImagesBatch(cleaned, { maxPerQuery: 3 });

  const out: Record<string, string> = {};
  for (const query of cleaned) {
    // Results are position-ordered; take the first that actually carries a URL
    // (the actor occasionally returns a row with only a thumbnail).
    const hit = (found.get(query) || []).find((r) => r.imageUrl || r.thumbnailUrl);
    const url = hit?.imageUrl || hit?.thumbnailUrl;
    if (url) out[query] = url;
  }
  return out;
}
