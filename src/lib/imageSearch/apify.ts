/**
 * Apify Google Images provider — the ONLY file that knows about Apify.
 * Server-only (reads APIFY_API_TOKEN). Swap this file to change providers.
 */

const TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR = process.env.APIFY_GOOGLE_IMAGES_ACTOR || "johnvc~google-images-api";
const DEFAULT_MAX = parseInt(process.env.IMAGE_SEARCH_MAX_RESULTS || "3", 10);
const DEFAULT_GL = process.env.IMAGE_SEARCH_COUNTRY || "in";
const DEFAULT_HL = process.env.IMAGE_SEARCH_LANGUAGE || "en";

export type GoogleImageResult = {
  query: string;
  position: number;
  title: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  source: string;
  domain: string;
  sourcePage: string;
};

type ApifyRaw = {
  query?: string;
  position?: string | number;
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  domain?: string;
  link?: string;
};

async function runActor(
  queries: string[],
  gl: string,
  hl: string,
  maxPerQuery: number
): Promise<GoogleImageResult[]> {
  const url = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ queries, maxResultsPerQuery: maxPerQuery, gl, hl }),
    signal: AbortSignal.timeout(90000),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Never log the token; only the status + provider body.
    console.error("Apify request failed:", res.status, text.slice(0, 200));
    throw new Error(`Apify ${res.status}`);
  }
  const raw = (await res.json()) as ApifyRaw[];
  return (Array.isArray(raw) ? raw : []).map((it) => ({
    query: it.query || "",
    position: Number(it.position) || 0,
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
 * Batch Google-image search. Sends queries in chunks (the actor accepts an
 * array of queries) and returns query -> ordered results.
 */
export async function searchGoogleImagesBatch(
  queries: string[],
  opts: { gl?: string; hl?: string; maxPerQuery?: number } = {}
): Promise<Map<string, GoogleImageResult[]>> {
  if (!TOKEN) throw new Error("APIFY_API_TOKEN not configured");
  const gl = opts.gl || DEFAULT_GL;
  const hl = opts.hl || DEFAULT_HL;
  const maxPerQuery = opts.maxPerQuery || DEFAULT_MAX;

  const unique = Array.from(
    new Set(queries.map((q) => q.trim()).filter(Boolean))
  );
  const map = new Map<string, GoogleImageResult[]>();
  const CHUNK = 20;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const items = await runActor(chunk, gl, hl, maxPerQuery);
    for (const it of items) {
      const arr = map.get(it.query) || [];
      arr.push(it);
      map.set(it.query, arr);
    }
  }
  for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
  return map;
}
