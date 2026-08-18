/**
 * Serper Google Images provider — the ONLY file that knows about Serper.
 * Server-only (reads SERPER_API_KEY). Mirrors the shape of ./apify.ts so the
 * two are interchangeable behind `searchGoogleImagesBatch`.
 *
 * Used by the "Get all images" bulk fill. The image-picker gallery stays on
 * Apify: the picker is one query per user click, while a bulk fill is hundreds
 * of queries in a burst, which is where the cost difference actually lands.
 *
 * Serper returns real Google Images results and passes Google's own filter
 * parameters straight through, so the quality filtering happens at the source:
 *
 *   safe=active     SafeSearch — no explicit/vulgar imagery
 *   tbs=itp:photo   photographs only — no clipart, lineart, drawings, logos
 *   tbs=ift:jpg     JPEG only, which structurally excludes GIFs
 */

import type { GoogleImageResult } from "./apify";

const KEY = process.env.SERPER_API_KEY;
const ENDPOINT = "https://google.serper.dev/images";
const DEFAULT_GL = process.env.IMAGE_SEARCH_COUNTRY || "in";
const DEFAULT_HL = process.env.IMAGE_SEARCH_LANGUAGE || "en";

/**
 * Serper bills per result PAGE, not per result: `num` up to 10 costs one
 * credit, and anything above rounds up to a 100-result page at two credits.
 * Ten is therefore the most results obtainable at the minimum price, and worth
 * taking — only the first usable image is kept, but the rest are the fallbacks
 * for when a URL hotlink-blocks or turns out not to be a real image.
 */
const NUM = 10;

/** Google filters applied to every query. See the file header. */
const TBS = "itp:photo,ift:jpg";

/** How many queries to have in flight; Serper's documented limit is 5/second. */
const CONCURRENCY = 4;

type SerperImage = {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  domain?: string;
  link?: string;
  position?: number;
};

export function isSerperConfigured(): boolean {
  return Boolean(KEY);
}

async function searchOne(
  query: string,
  gl: string,
  hl: string,
  num: number
): Promise<GoogleImageResult[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "X-API-KEY": KEY as string, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl, hl, num, safe: "active", tbs: TBS }),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Never log the key; only the status + provider body.
    console.error("Serper request failed:", res.status, text.slice(0, 200));
    throw new Error(`Serper ${res.status}`);
  }
  const json = (await res.json()) as { images?: SerperImage[] };
  return (json.images || []).map((it, i) => ({
    query,
    position: Number(it.position) || i + 1,
    title: it.title || "",
    imageUrl: it.imageUrl || null,
    thumbnailUrl: it.thumbnailUrl || null,
    width: it.imageWidth ?? null,
    height: it.imageHeight ?? null,
    source: it.source || "",
    domain: it.domain || "",
    sourcePage: it.link || "",
  }));
}

/**
 * Batch Google-image search, same contract as the Apify provider.
 *
 * Serper has no multi-query endpoint, so "batch" here means bounded-concurrency
 * fan-out. A query that fails after its retries resolves to an empty list
 * rather than rejecting the whole batch — one bad dish name must not lose the
 * images for every other item in the run.
 */
export async function searchGoogleImagesBatch(
  queries: string[],
  opts: { gl?: string; hl?: string; maxPerQuery?: number } = {}
): Promise<Map<string, GoogleImageResult[]>> {
  if (!KEY) throw new Error("SERPER_API_KEY not configured");
  const gl = opts.gl || DEFAULT_GL;
  const hl = opts.hl || DEFAULT_HL;
  const num = Math.min(opts.maxPerQuery || NUM, NUM);

  const unique = Array.from(
    new Set(queries.map((q) => q.trim()).filter(Boolean))
  );
  const map = new Map<string, GoogleImageResult[]>();

  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      const query = unique[cursor++];
      let results: GoogleImageResult[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          results = await searchOne(query, gl, hl, num);
          break;
        } catch {
          // 429s and transient 5xxs both land here; back off and retry.
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }
      map.set(query, results);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker)
  );

  for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
  return map;
}
