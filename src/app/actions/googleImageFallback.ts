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

/** Menu item name -> Google search query. */
function buildQuery(name: string): string {
  return `${name.trim()} food`.slice(0, 100);
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
    results = await searchGoogleImagesBatch([...queryToItems.keys()], opts);
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
