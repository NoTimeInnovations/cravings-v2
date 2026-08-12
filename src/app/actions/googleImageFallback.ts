"use server";

import { searchGoogleImagesBatch, type GoogleImageResult } from "@/lib/imageSearch/apify";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { fetchFromHasura } from "@/lib/hasuraClient";

export type FallbackInItem = {
  id?: string; // menu item id (absent for not-yet-saved AddCategory items)
  name: string;
  category_name?: string | null;
};

export type FallbackOutItem = {
  id?: string;
  name: string;
  image_url: string; // permanent S3 URL
};

/**
 * Google operators appended to EVERY image search.
 *
 * The social and video domains dominate image results for dish names while
 * being almost useless as menu photos: Facebook and Instagram return page
 * avatars and reel thumbnails, Pinterest returns collages and watermarked
 * re-uploads, YouTube returns video stills with play buttons and text overlays.
 * Excluding them pushes real food photography up the ranking.
 */
export const IMAGE_SEARCH_SUFFIX =
  "food item -site:facebook.com -site:instagram.com -site:pinterest.com -site:youtube.com";

/**
 * Decorate a raw search term with the operators above.
 *
 * The NAME is truncated, never the suffix: slicing the combined string would
 * cut an operator in half ("-site:youtub"), which Google reads as a normal
 * term and silently stops excluding that domain.
 */
export function decorateImageQuery(term: string): string {
  return `${(term || "").trim().slice(0, 80)} ${IMAGE_SEARCH_SUFFIX}`;
}

/** Menu item name -> Google search query. */
function buildQuery(name: string): string {
  return decorateImageQuery(name);
}

/**
 * Fetch a remote image server-side and return it as a data URL (so
 * uploadFileToS3 stores it with the correct content type). Returns null on any
 * failure (hotlink block, timeout, non-image, tiny/broken file).
 */
async function fetchAsDataUrl(
  url: string
): Promise<{ dataUrl: string; ext: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return null; // too small to be a real image
    const ext = (ct.split("/")[1] || "jpg").split(";")[0].replace("jpeg", "jpg");
    return { dataUrl: `data:${ct};base64,${buf.toString("base64")}`, ext };
  } catch {
    return null;
  }
}

/**
 * Fallback image sourcing for "Get all images": for menu items NOT found in the
 * Menuthere image DB, search Google via Apify, re-upload the best result to the
 * partner's S3 (permanent), and record it back in the image DB so future runs
 * are instant DB hits. Returns only the items we successfully filled.
 */
export async function fillItemsFromGoogle(
  partnerId: string,
  partnerName: string,
  items: FallbackInItem[],
  opts: { gl?: string; hl?: string } = {}
): Promise<FallbackOutItem[]> {
  if (!partnerId || !items?.length) return [];

  // Map query -> items sharing that query (dedupes identical names).
  const queryToItems = new Map<string, FallbackInItem[]>();
  for (const it of items) {
    if (!it.name?.trim()) continue;
    const q = buildQuery(it.name);
    const arr = queryToItems.get(q) || [];
    arr.push(it);
    queryToItems.set(q, arr);
  }
  if (!queryToItems.size) return [];

  let results: Map<string, GoogleImageResult[]>;
  try {
    // Ask for several candidates, not the 3 the provider defaults to. Each one
    // is only a CHANCE at an image: hotlink-blocked hosts, non-image content
    // types and sub-1KB files are all discarded below, so a short list means an
    // item silently ends up with no picture. The extra candidates cost nothing
    // unless the earlier ones fail — the loop stops at the first upload.
    results = await searchGoogleImagesBatch([...queryToItems.keys()], {
      maxPerQuery: 8,
      ...opts,
    });
  } catch (e) {
    console.error("Apify search failed:", e);
    return [];
  }

  const out: FallbackOutItem[] = [];
  const bankInserts: Array<Record<string, unknown>> = [];
  const entries = [...queryToItems.entries()];

  // Bounded concurrency for the fetch+upload work.
  const CONCURRENCY = 5;
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const [query, group] = entries[cursor++];
      const candidates = results.get(query) || [];
      let s3Url: string | null = null;

      for (const c of candidates) {
        // Prefer full image; fall back to the (reliable) gstatic thumbnail.
        const sources = [c.imageUrl, c.thumbnailUrl].filter(Boolean) as string[];
        for (const src of sources) {
          const fetched = await fetchAsDataUrl(src);
          if (!fetched) continue;
          const safe = group[0].name
            .replace(/[^a-zA-Z0-9]/g, "_")
            .replace(/_+/g, "_")
            .slice(0, 60);
          try {
            s3Url = await uploadFileToS3(
              fetched.dataUrl,
              `${partnerId}/menu/google_${safe}_${Date.now()}.${fetched.ext}`
            );
          } catch (e) {
            console.warn("S3 upload failed:", e);
            s3Url = null;
          }
          if (s3Url) break;
        }
        if (s3Url) break;
      }

      if (s3Url) {
        for (const it of group) {
          out.push({ id: it.id, name: it.name, image_url: s3Url });
        }
        bankInserts.push({
          item_name: group[0].name,
          category_name: group[0].category_name ?? null,
          image_url: s3Url,
          partner_id: partnerId,
          partner_name: partnerName,
          source_menu_id: group[0].id ?? null,
          notes: "google-fallback",
        });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker)
  );

  // Record fills into the image DB so the next "Get all images" is a DB hit.
  if (bankInserts.length) {
    try {
      await fetchFromHasura(
        `mutation SaveBankImages($objects: [item_images_insert_input!]!) {
          insert_item_images(objects: $objects, on_conflict: { constraint: item_images_image_url_key, update_columns: [] }) {
            affected_rows
          }
        }`,
        { objects: bankInserts }
      );
    } catch (e) {
      console.warn("Saving fallback images to image DB failed:", e);
    }
  }

  return out;
}

/**
 * Single-item variant of fillItemsFromGoogle — used by "Get all images" to fetch
 * and apply images ONE BY ONE (with client-side concurrency) so each image lands
 * in the UI the moment it's ready, instead of waiting for the whole batch. Reuses
 * the same robust path (Apify search → S3 re-upload → image-bank cache).
 */
export async function fillOneItemFromGoogle(
  partnerId: string,
  partnerName: string,
  item: FallbackInItem,
  opts: { gl?: string; hl?: string } = {}
): Promise<FallbackOutItem | null> {
  const [result] = await fillItemsFromGoogle(partnerId, partnerName, [item], opts);
  return result ?? null;
}

/**
 * Google image results for ONE query, for the image picker.
 *
 * The picker previously called images.cravings.live/api/images/search-google,
 * which returns a single URL — so the "Google images" tab could only ever offer
 * one option, and if it was wrong there was nothing to pick instead. Apify is the
 * provider the rest of the app already uses for image search, and it returns a
 * ranked list, which is the whole point of a gallery.
 *
 * Returns [] rather than throwing: an empty gallery is a recoverable state the
 * UI already renders, and the picker has two other tabs that must keep working.
 */
export async function searchGoogleImagesForPicker(
  query: string,
  max = 12,
): Promise<GoogleImageResult[]> {
  const q = (query || "").trim();
  if (!q) return [];
  // The provider keys its results by the query STRING it was given, so the
  // lookup has to use the decorated form — reading back by the raw term would
  // always miss and render an empty gallery.
  const decorated = decorateImageQuery(q);
  try {
    const map = await searchGoogleImagesBatch([decorated], { maxPerQuery: max });
    return (map.get(decorated) || []).filter((r) => r.imageUrl);
  } catch (e) {
    console.error("[googleImages] picker search failed:", e);
    return [];
  }
}
