#!/usr/bin/env node
/**
 * menu-images.mjs — fill missing menu item images for a partner, end to end.
 *
 * Mirrors the app's "Get all images" pipeline (AdminV2Menu.tsx ->
 * app/actions/googleImageFallback.ts) but runs entirely from the CLI and
 * sources images from DuckDuckGo instead of the paid Apify actor:
 *
 *   resolve partner -> read menu -> item_images bank (free) -> image search
 *   -> download + validate -> re-upload to the partner's S3 -> update_menu_many
 *   -> record fills back into item_images -> emit an HTML review sheet
 *
 * Credentials come from the repo's .env.local (NEXT_PUBLIC_HASURA_* +
 * NEXT_PUBLIC_S3_*), same as create-partner.mjs. Nothing is hardcoded.
 *
 * Usage:
 *   node menu-images.mjs "<partner>" [flags]
 *
 *   <partner>            store-name substring, @username, or partner uuid
 *   --dry-run            resolve + plan + print the queries; NO writes
 *   --overwrite          also re-image items that already have an image
 *   --limit N            only process the first N items needing images
 *   --cuisine "<hint>"   override the auto cuisine hint (e.g. "kerala indian")
 *   --concurrency N      search/upload workers (default 8)
 *   --candidates <file>  skip searching; ingest a {name:[urls]} JSON
 *                        (browser fallback — see SKILL.md)
 *   --emit-queries <f>   write the {name:term} query map and exit (browser mode)
 *   --sheet <file>       review-sheet path (default ./menu-images-<slug>.html)
 *   --json               print the machine-readable summary only
 *
 * Exit codes: 0 ok, 1 error, 2 ambiguous / partner not found.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const die = (m, code = 1) => {
  console.error("ERROR: " + m);
  process.exit(code);
};

// ---------------------------------------------------------------------------
// env (same loader + precedence as create-partner.mjs)
// ---------------------------------------------------------------------------
function findRepoRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, "package.json")) &&
      fs.existsSync(path.join(dir, ".env.local"))
    )
      return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(__dirname, "../../../..");
}

function loadEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    )
      val = val.slice(1, -1);
    env[m[1]] = val;
  }
  return env;
}

const REPO_ROOT = findRepoRoot(__dirname);
const ENV = { ...loadEnvFile(path.join(REPO_ROOT, ".env.local")), ...process.env };

const HASURA_ENDPOINT =
  ENV.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT ||
  (ENV.HASURA_GRAPHQL_ENDPOINT_HASURA
    ? ENV.HASURA_GRAPHQL_ENDPOINT_HASURA.replace(/\/+$/, "") + "/v1/graphql"
    : null);
const HASURA_SECRET =
  ENV.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET || ENV.HASURA_GRAPHQL_ADMIN_SECRET;
if (!HASURA_ENDPOINT || !HASURA_SECRET)
  die("Missing NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT / _ADMIN_SECRET in .env.local");

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const VALUE_FLAGS = new Set([
  "--limit",
  "--cuisine",
  "--concurrency",
  "--candidates",
  "--emit-queries",
  "--sheet",
  "--engine",
  "--gl",
  "--num",
]);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

let PARTNER_Q = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    if (VALUE_FLAGS.has(argv[i])) i++; // skip its value
    continue;
  }
  PARTNER_Q = argv[i];
  break;
}
if (!PARTNER_Q)
  die('Usage: node menu-images.mjs "<partner name|@username|uuid>" [--dry-run] [--overwrite]');

const DRY = flag("--dry-run");
const OVERWRITE = flag("--overwrite");
const JSON_ONLY = flag("--json");
const LIMIT = parseInt(opt("--limit", "0"), 10) || 0;
const CONC = parseInt(opt("--concurrency", ENV.SERPER_API_KEY ? "4" : "8"), 10) || 8;
const CUISINE_OVERRIDE = opt("--cuisine", "");
const NO_BANK = flag("--no-bank");
const SERPER_GL = opt("--gl", "in");
/**
 * Serper bills per result page, not per result: num<=10 costs 1 credit, and
 * anything above rounds up to a 100-result page at 2 credits. 10 is thus the
 * most results obtainable for the minimum price — and worth taking, because
 * only the FIRST usable candidate is kept: the rest are the fallbacks used when
 * a URL hotlink-blocks, is not a real image, or is already used by another dish.
 */
const SERPER_NUM = Math.min(parseInt(opt("--num", "10"), 10) || 10, 10);
const ENGINE = opt("--engine", ENV.SERPER_API_KEY ? "google" : "auto");
if (ENGINE === "google" && !ENV.SERPER_API_KEY)
  die("--engine google needs SERPER_API_KEY in .env.local (free tier at serper.dev)");
const CANDIDATES_IN = opt("--candidates", "");
const EMIT_QUERIES = opt("--emit-queries", "");
const log = (...a) => {
  if (!JSON_ONLY) console.log(...a);
};

// ---------------------------------------------------------------------------
// hasura
// ---------------------------------------------------------------------------
async function gql(query, variables) {
  const res = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hasura-admin-secret": HASURA_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

// ---------------------------------------------------------------------------
// query shaping — the main accuracy lever
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Items that are not food; imaging them produces nonsense. */
const NON_FOOD =
  /^(tisu|tissue|mineral|water bottle|cutlery|spoon|fork|packing|packing charge|parcel|delivery charge|service charge|container|carry ?bag|extra plate|planta)$/i;

/** Non-Latin scripts: Arabic, Devanagari, Malayalam, Tamil, Thai, CJK, Hangul. */
const NON_LATIN =
  /[؀-ۿऀ-ॿഀ-ൿ஀-௿฀-๿一-鿿가-힯]/;

/** Cuisine hint from the partner's country dial code. */
const CUISINE_BY_CC = {
  "+91": "indian",
  "+968": "arabic omani",
  "+971": "arabic",
  "+966": "arabic saudi",
  "+974": "arabic",
  "+973": "arabic",
  "+965": "arabic",
  "+60": "malaysian",
  "+65": "singaporean",
  "+62": "indonesian",
  "+94": "sri lankan",
  "+880": "bangladeshi",
};

/** Category keyword -> the noun that makes image search return the right shot. */
function categorySuffix(cat = "") {
  const c = String(cat).toLowerCase();
  if (
    /juice|drink|beverage|minuman|shake|mojito|mocktail|soda|tea|teh|coffee|kopi|milo|lassi|smoothie|water/.test(c)
  )
    return "drink glass";
  if (/cake|bakery|dessert|pastry|sweet|ice ?cream|pudding/.test(c))
    return "bakery dessert";
  if (/bread|roti|naan|paratha|puttu/.test(c)) return "bread";
  if (/soup|sup/.test(c)) return "soup bowl";
  return "food dish";
}

/**
 * Menu name -> search term.
 *
 * Bilingual names ("كبسة عربي (Arabic Kabsa)", "AYAM (CHICKEN)") carry the
 * searchable signal in the LATIN half, so a parenthesised Latin fragment wins
 * over the raw name. Size/qty qualifiers are dropped because they pull results
 * toward packaging shots rather than the dish.
 */
function buildTerm(name, categoryName, cuisine) {
  let base = String(name || "").trim();
  const parens = [...base.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());
  const latinParen = parens.find(
    (p) => /[A-Za-z]/.test(p) && p.replace(/[^A-Za-z]/g, "").length >= 3
  );
  if (latinParen && (NON_LATIN.test(base) || latinParen.split(/\s+/).length >= 2))
    base = latinParen;

  base = base
    .replace(/\([^)]*\)/g, " ")
    .replace(/[/_+]/g, " ")
    .replace(
      /\b(small|medium|large|regular|half|full|qty|pcs?|nos?|set|\d+\s?(ml|ltr|l|g|kg|pc))\b/gi,
      " "
    )
    .replace(/[^\p{L}\p{N}\s'&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) base = String(name || "").trim();

  const parts = [base.slice(0, 70)];
  if (cuisine) parts.push(cuisine);
  parts.push(categorySuffix(categoryName));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// image search (DuckDuckGo; no API key, no paid actor)
// ---------------------------------------------------------------------------
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

/**
 * Social + video junk, and stock hosts whose free previews are WATERMARKED —
 * a watermarked photo is worse than no photo on a live menu.
 */
const BAD_HOST =
  /pinterest|pinimg|facebook|instagram|youtube|fbcdn|lookaside|tiktok|ytimg|shutterstock|alamy|dreamstime|123rf|gettyimages|istockphoto|depositphotos|vecteezy|freepik/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Engine tally, reported in the summary so throttling is visible not silent. */
const engineUsed = { google: 0, ddg: 0, bing: 0, none: 0 };

/**
 * Google Images via Serper.
 *
 * Google itself cannot be used directly: it serves no server-rendered HTML, and
 * driving it from a browser tab earns an HTTP 429 + CAPTCHA after ~40 queries.
 * Serper is a paid-but-free-tier proxy that returns real Google Images results,
 * and — crucially — passes `tbs` and `safe` straight through, so Google's own
 * content filters do the heavy lifting:
 *
 *   safe=active    SafeSearch: no explicit / vulgar imagery
 *   tbs=itp:photo  photographs only: no clipart, lineart, drawings, logos
 *   tbs=ift:jpg    JPEG only, which structurally excludes GIFs
 */
async function serperSearch(term, tries = 3) {
  for (let a = 0; a < tries; a++) {
    try {
      const res = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: {
          "X-API-KEY": ENV.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: term,
          gl: SERPER_GL,
          hl: "en",
          num: SERPER_NUM,
          safe: "active",
          tbs: "itp:photo,ift:jpg",
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 429) {
        await sleep(1500 * (a + 1));
        continue;
      }
      if (!res.ok) {
        await sleep(500 * (a + 1));
        continue;
      }
      const j = await res.json();
      return (j.images || [])
        .filter(
          (x) =>
            x.imageUrl &&
            !BAD_HOST.test(x.imageUrl) &&
            !/\.(gif|svg)(\?|$)/i.test(x.imageUrl) &&
            (x.imageWidth || 0) >= 400 &&
            (x.imageHeight || 0) >= 300
        )
        .slice(0, 6)
        .map((x) => x.imageUrl);
    } catch {
      await sleep(500 * (a + 1));
    }
  }
  return [];
}

async function ddgSearch(term, tries = 3) {
  const q = encodeURIComponent(term);
  for (let a = 0; a < tries; a++) {
    try {
      const t = await fetch(
        `https://duckduckgo.com/?q=${q}&iar=images&iax=images&ia=images`,
        { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) }
      );
      const html = await t.text();
      const m = html.match(/vqd=["']?([\d-]+)["']?/);
      if (!m) {
        await sleep(400 * (a + 1));
        continue;
      }
      const r = await fetch(
        `https://duckduckgo.com/i.js?l=us-en&o=json&q=${q}&vqd=${m[1]}&f=,,,&p=1`,
        {
          headers: {
            "User-Agent": UA,
            Referer: "https://duckduckgo.com/",
            Accept: "application/json, text/javascript, */*; q=0.01",
          },
          signal: AbortSignal.timeout(20000),
        }
      );
      if (r.status === 429) {
        await sleep(1200 * (a + 1));
        continue;
      }
      if (!r.ok) {
        await sleep(400 * (a + 1));
        continue;
      }
      const j = await r.json();
      return (j.results || [])
        .filter(
          (x) =>
            x.image &&
            !BAD_HOST.test(x.image) &&
            (x.width || 0) >= 400 &&
            (x.height || 0) >= 300
        )
        .slice(0, 5)
        .map((x) => x.image);
    } catch {
      await sleep(400 * (a + 1));
    }
  }
  return [];
}

/**
 * Bing images — fallback engine.
 *
 * DuckDuckGo throttles hard once a run gets into the low hundreds of queries:
 * it stops erroring and simply returns empty result sets, which silently looks
 * like "this dish has no photo". Bing serves the same queries happily, so a run
 * that would have left most of a large menu blank still completes. Bing's markup
 * carries no dimensions, so size filtering falls to the download step (which
 * rejects anything under 2KB and sniffs magic bytes anyway).
 */
async function bingSearch(term, tries = 2) {
  const q = encodeURIComponent(term);
  for (let a = 0; a < tries; a++) {
    try {
      const res = await fetch(
        `https://www.bing.com/images/search?q=${q}&form=HDRSC2&first=1`,
        {
          headers: {
            "User-Agent": UA,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: AbortSignal.timeout(20000),
        }
      );
      const html = await res.text();
      const out = new Set();
      const re = /murl&quot;:&quot;(.*?)&quot;/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const url = m[1].replace(/&amp;/g, "&");
        if (url.startsWith("http") && !BAD_HOST.test(url)) out.add(url);
      }
      if (out.size) return [...out].slice(0, 5);
      await sleep(400 * (a + 1));
    } catch {
      await sleep(400 * (a + 1));
    }
  }
  return [];
}

/**
 * Engine router.
 *
 * With a Serper key present the default is `google` and it is EXCLUSIVE: an
 * empty Google result is reported as empty rather than quietly backfilled from
 * DuckDuckGo, because "use Google" has to mean the images actually came from
 * Google. Use --engine to override.
 */
async function imageSearch(term) {
  if (ENGINE === "google") {
    const g = await serperSearch(term);
    if (g.length) engineUsed.google++;
    else engineUsed.none++;
    return g;
  }
  if (ENGINE === "bing") {
    const b = await bingSearch(term);
    if (b.length) engineUsed.bing++;
    else engineUsed.none++;
    return b;
  }
  const ddg = await ddgSearch(term);
  if (ddg.length) {
    engineUsed.ddg++;
    return ddg;
  }
  const bing = await bingSearch(term);
  if (bing.length) {
    engineUsed.bing++;
    return bing;
  }
  engineUsed.none++;
  return [];
}

// ---------------------------------------------------------------------------
// download + validate + upload
// ---------------------------------------------------------------------------
const S3_OK =
  ENV.NEXT_PUBLIC_S3_BUCKET &&
  ENV.NEXT_PUBLIC_S3_ACCESS_KEY &&
  ENV.NEXT_PUBLIC_S3_SECRET_KEY;
const s3 = S3_OK
  ? new S3Client({
      region: ENV.NEXT_PUBLIC_S3_REGION,
      credentials: {
        accessKeyId: ENV.NEXT_PUBLIC_S3_ACCESS_KEY,
        secretAccessKey: ENV.NEXT_PUBLIC_S3_SECRET_KEY,
      },
      requestTimeout: 120000,
      maxAttempts: 3,
    })
  : null;

/**
 * Magic-byte sniff. Content-Type lies often enough that an HTML error page
 * served as image/jpeg would otherwise get stored and render as a broken tile.
 */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { ext: "jpg", ct: "image/jpeg" };
  if (
    buf
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return { ext: "png", ct: "image/png" };
  // GIF is deliberately absent: animated GIFs render as moving tiles on the
  // storefront and static ones are 256-colour and look poor next to photos.
  // Returning null here makes the caller fall through to the next candidate.
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return { ext: "webp", ct: "image/webp" };
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (/avif|avis/.test(brand)) return { ext: "avif", ct: "image/avif" };
    if (/heic|heix|mif1/.test(brand)) return { ext: "heic", ct: "image/heic" };
  }
  return null;
}

async function fetchImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: new URL(url).origin + "/",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2048) return null; // thumbnails / 1x1 trackers
    const kind = sniff(buf);
    if (!kind || kind.ext === "heic") return null; // heic will not render in browsers
    return { buf, ...kind };
  } catch {
    return null;
  }
}

async function uploadToS3(partnerId, name, got) {
  const safe = String(name)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
  const key = `${partnerId}/menu/google_${safe}_${Date.now()}.${got.ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.NEXT_PUBLIC_S3_BUCKET,
      Key: key,
      Body: got.buf,
      ContentType: got.ct,
    })
  );
  return `https://${ENV.NEXT_PUBLIC_S3_BUCKET}.s3.${ENV.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${key}`;
}

/** Run `fn` over `items` with a fixed worker pool. */
async function pool(items, n, fn) {
  let i = 0;
  const out = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    })
  );
  return out;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const t0 = Date.now();

// 1. resolve partner
const where = UUID_RE.test(PARTNER_Q)
  ? { id: { _eq: PARTNER_Q } }
  : PARTNER_Q.startsWith("@")
    ? { username: { _eq: PARTNER_Q.slice(1) } }
    : { store_name: { _ilike: `%${PARTNER_Q}%` } };

const { partners } = await gql(
  `query FindPartner($where: partners_bool_exp!) {
     partners(where: $where, limit: 25) { id store_name username status country_code district }
   }`,
  { where }
);
if (!partners.length) die(`No partner matches ${JSON.stringify(PARTNER_Q)}`, 2);

let partner = partners[0];
if (partners.length > 1) {
  const exact = partners.filter(
    (p) =>
      (p.store_name || "").trim().toLowerCase() ===
      PARTNER_Q.trim().toLowerCase()
  );
  if (exact.length === 1) partner = exact[0];
  else {
    console.error(
      `Ambiguous — ${partners.length} partners match ${JSON.stringify(PARTNER_Q)}:`
    );
    for (const p of partners)
      console.error(
        `  ${p.id}  ${p.store_name}  (${p.status}, ${p.country_code} ${p.district || ""})`
      );
    console.error("Re-run with the exact store name or the uuid.");
    process.exit(2);
  }
}

const cuisine = CUISINE_OVERRIDE || CUISINE_BY_CC[partner.country_code] || "";
log(`Engine  : ${ENGINE}${ENGINE === "google" ? " (serper -> google images, safe=active, photos-only, jpeg-only)" : ""}`);
log(`Partner : ${partner.store_name}  [${partner.id}]`);
log(
  `Locale  : ${partner.country_code} ${partner.district || ""} -> cuisine hint ${cuisine ? `"${cuisine}"` : "(none)"}`
);

// 2. menu
const MENU_Q = `query Menu($p: uuid!) {
  menu(where: { partner_id: { _eq: $p }, deletion_status: { _eq: 0 } }, order_by: { name: asc }) {
    id name image_url category { name }
  }
}`;
const { menu } = await gql(MENU_Q, { p: partner.id });
const isEmpty = (m) => !m.image_url || String(m.image_url).trim() === "";

let existingHashes = new Map();
let dupeGroups = [];
const REDO_DUPES = flag("--redo-duplicates") || flag("--audit");
const AUDIT_ONLY = flag("--audit");

/**
 * Hash the bytes behind every image already on the menu.
 *
 * Uniqueness cannot be judged from URLs alone: the same photo is routinely
 * served from several hosts, and a partner imaged over multiple runs gets a
 * fresh S3 key each time, so byte-identical pictures hide behind distinct URLs.
 */
async function hashExisting(items) {
  const urls = [...new Set(items.filter((m) => !isEmpty(m)).map((m) => m.image_url))];
  const hashOf = new Map();
  let i = 0;
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (i < urls.length) {
        const u = urls[i++];
        try {
          const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
          if (!r.ok) continue;
          hashOf.set(
            u,
            createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex")
          );
        } catch {
          /* unreachable image — treated as unknown, not as a duplicate */
        }
      }
    })
  );
  return hashOf;
}

let targets;
if (REDO_DUPES) {
  // Keep one item per shared photo (the first by name) and re-image the rest,
  // but only where the names actually differ — two menu rows with the SAME name
  // are meant to share a picture.
  log("Hashing existing images to find true duplicates...");
  existingHashes = await hashExisting(menu);
  // Group by content hash where known, else by URL, so byte-identical photos
  // sitting at different S3 keys collapse into one group.
  const groups = new Map();
  for (const m of menu) {
    if (isEmpty(m)) continue;
    const k = existingHashes.get(m.image_url) || "url:" + m.image_url;
    const arr = groups.get(k) || [];
    arr.push(m);
    groups.set(k, arr);
  }
  targets = [];
  dupeGroups = [];
  for (const group of groups.values()) {
    const names = new Set(group.map((g) => (g.name || "").trim().toLowerCase()));
    if (group.length < 2 || names.size < 2) continue;   // same dish may repeat
    dupeGroups.push([...new Set(group.map((g) => g.name))]);
    const seen = new Set();
    for (const m of group) {
      const k = (m.name || "").trim().toLowerCase();
      if (!seen.size) { seen.add(k); continue; }   // first name keeps the photo
      if (seen.has(k)) continue;                   // same name -> may share it
      targets.push(m);
    }
  }
  log(`Dupes   : ${dupeGroups.length} groups of different dishes share a photo (${targets.length} to re-image)`);
  if (AUDIT_ONLY) {
    for (const g of dupeGroups) log("   " + g.join("  |  "));
    const miss = menu.filter(isEmpty).length;
    log(`\nAudit: ${menu.length} items, ${miss} without an image, ${dupeGroups.length} duplicate groups. No writes.`);
    process.exit(0);
  }
} else targets = menu.filter((m) => (OVERWRITE ? true : isEmpty(m)));
const skippedNonFood = targets.filter((m) => NON_FOOD.test(String(m.name).trim()));
targets = targets.filter((m) => !NON_FOOD.test(String(m.name).trim()));
if (LIMIT) targets = targets.slice(0, LIMIT);

log(`Menu    : ${menu.length} items, ${menu.filter(isEmpty).length} without an image`);
if (skippedNonFood.length)
  log(
    `Skipped : ${skippedNonFood.length} non-food (${skippedNonFood.map((m) => m.name).join(", ")})`
  );

if (!targets.length) {
  const summary = {
    partner: partner.store_name,
    partner_id: partner.id,
    total: menu.length,
    missing: 0,
    filled: 0,
    note: "nothing to do",
  };
  console.log(
    JSON_ONLY
      ? JSON.stringify(summary)
      : "\nNothing to do — every item already has an image."
  );
  process.exit(0);
}

// 3. image bank first (free + instant)
const uniqueNames = [...new Set(targets.map((m) => m.name).filter(Boolean))];
const urlByName = new Map();
if (!OVERWRITE && !REDO_DUPES && !NO_BANK) {
  const { item_images } = await gql(
    `query BankImages($names: [String!]!) {
       item_images(where: { item_name: { _in: $names } }) { item_name image_url }
     }`,
    { names: uniqueNames }
  );
  for (const row of item_images || []) {
    const k = (row.item_name || "").trim().toLowerCase();
    if (k && row.image_url && !urlByName.has(k)) urlByName.set(k, row.image_url);
  }
}
const fromBank = targets.filter((m) =>
  urlByName.has((m.name || "").trim().toLowerCase())
);
log(`Bank    : ${fromBank.length}/${targets.length} items matched the image bank (free)`);

// 4. build queries for the misses
const misses = targets.filter(
  (m) => !urlByName.has((m.name || "").trim().toLowerCase())
);
const termByName = new Map();
for (const m of misses)
  if (!termByName.has(m.name))
    termByName.set(m.name, buildTerm(m.name, m.category?.name, cuisine));

if (EMIT_QUERIES) {
  fs.writeFileSync(
    EMIT_QUERIES,
    JSON.stringify(Object.fromEntries(termByName), null, 1)
  );
  log(`Wrote ${termByName.size} queries -> ${EMIT_QUERIES}`);
  process.exit(0);
}

if (DRY) {
  log(`\nWould search ${termByName.size} unique names:`);
  for (const [n, t] of [...termByName].slice(0, 40)) log(`  ${n}\n    -> ${t}`);
  if (termByName.size > 40) log(`  ... ${termByName.size - 40} more`);
  log(
    `\nDry run — no writes. ${fromBank.length} would come from the bank, ${termByName.size} from search.`
  );
  process.exit(0);
}

if (!S3_OK) die("Missing NEXT_PUBLIC_S3_* credentials in .env.local");

// 5. search
let candidates = {};
if (CANDIDATES_IN) {
  candidates = JSON.parse(fs.readFileSync(CANDIDATES_IN, "utf8"));
  log(
    `Search  : ingested ${Object.keys(candidates).length} candidate sets from ${CANDIDATES_IN}`
  );
} else {
  const names = [...termByName.keys()];
  const found = await pool(names, CONC, (n) => imageSearch(termByName.get(n)));
  names.forEach((n, i) => {
    candidates[n] = found[i] || [];
  });
  const none = names.filter((n) => !candidates[n].length);
  log(
    `Search  : ${names.length - none.length}/${names.length} names returned candidates` +
      ` [google ${engineUsed.google} / ddg ${engineUsed.ddg} / bing ${engineUsed.bing} / none ${engineUsed.none}]` +
      (none.length
        ? ` (empty: ${none.slice(0, 5).join(", ")}${none.length > 5 ? "..." : ""})`
        : "")
  );
}

// 6. download + upload
//
// Uniqueness matters as much as relevance here: for obscure or misspelled item
// names ("POTH GINGER -GRAVY", "CHILLY MUSHHOUM-DRY") every engine falls back to
// the same generic results, so blindly taking candidate[0] hands a dozen
// different dishes one identical photo. Each item therefore claims a candidate
// no other item has used — by source URL *and* by content hash, since the same
// picture is often served from several hosts.
const searchNames = Object.keys(candidates);
const uploadedByName = new Map();
const usedUrls = new Set();
const usedHashes = new Set(existingHashes.values());
const notUnique = [];
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

await pool(searchNames, CONC, async (name) => {
  const list = candidates[name] || [];

  // Pass 1 — insist on an image nothing else is using.
  for (const url of list) {
    if (usedUrls.has(url)) continue;
    usedUrls.add(url); // claim before awaiting so parallel workers can't race
    const got = await fetchImage(url);
    if (!got) continue;
    const h = sha256(got.buf);
    if (usedHashes.has(h)) continue; // same bytes, different host
    usedHashes.add(h);
    try {
      uploadedByName.set(name, await uploadToS3(partner.id, name, got));
      return;
    } catch (e) {
      console.error(`  s3 fail ${name}: ${e.message}`);
    }
  }

  // Pass 2 — every candidate was taken. A duplicate photo beats a blank tile,
  // but it is reported so it can be fixed by hand.
  for (const url of list) {
    const got = await fetchImage(url);
    if (!got) continue;
    try {
      uploadedByName.set(name, await uploadToS3(partner.id, name, got));
      notUnique.push(name);
      return;
    } catch (e) {
      console.error(`  s3 fail ${name}: ${e.message}`);
    }
  }
});
log(
  `Upload  : ${uploadedByName.size}/${searchNames.length} images stored on S3` +
    (notUnique.length ? ` (${notUnique.length} reused an existing photo)` : "")
);

// 7. update menu (guarded: only fills empties unless --overwrite)
const updates = [];
const bank = new Map();
for (const m of targets) {
  const url =
    urlByName.get((m.name || "").trim().toLowerCase()) ||
    uploadedByName.get(m.name);
  if (!url) continue;
  const w = { id: { _eq: m.id } };
  if (!OVERWRITE && !REDO_DUPES)
    w._or = [{ image_url: { _is_null: true } }, { image_url: { _eq: "" } }];
  updates.push({ where: w, _set: { image_url: url } });
  if (uploadedByName.has(m.name) && !bank.has(m.name)) {
    bank.set(m.name, {
      item_name: m.name,
      category_name: m.category?.name ?? null,
      image_url: url,
      partner_id: partner.id,
      partner_name: partner.store_name,
      source_menu_id: m.id,
      notes: "ddg-fallback",
    });
  }
}

let affected = 0;
for (let i = 0; i < updates.length; i += 100) {
  const d = await gql(
    `mutation SetImages($updates: [menu_updates!]!) {
       update_menu_many(updates: $updates) { affected_rows }
     }`,
    { updates: updates.slice(i, i + 100) }
  );
  affected += (d.update_menu_many || []).reduce(
    (a, r) => a + (r?.affected_rows || 0),
    0
  );
}
log(`Hasura  : ${affected} menu rows updated`);

// 8. record fills so the next partner with these dishes is a free bank hit
let bankRows = 0;
if (bank.size) {
  try {
    const objs = [...bank.values()];
    for (let i = 0; i < objs.length; i += 100) {
      const d = await gql(
        `mutation SaveBankImages($objects: [item_images_insert_input!]!) {
           insert_item_images(objects: $objects, on_conflict: { constraint: item_images_image_url_key, update_columns: [] }) {
             affected_rows
           }
         }`,
        { objects: objs.slice(i, i + 100) }
      );
      bankRows += d.insert_item_images?.affected_rows || 0;
    }
  } catch (e) {
    console.error("image bank insert failed (non-fatal):", e.message);
  }
}
log(`Bank    : ${bankRows} rows recorded for reuse`);

// 8b. bust the ISR cache, or the storefront keeps serving the old menu.
// CLAUDE.md: "After any partner mutation, call revalidateTag(partnerId)".
// The app exposes that server action over GET /api/revalidate-tag.
let revalidated = false;
if (affected > 0) {
  const base = (ENV.NEXT_PUBLIC_SITE_URL || "https://menuthere.com").replace(/\/+$/, "");
  try {
    const r = await fetch(`${base}/api/revalidate-tag?tag=${partner.id}`, {
      signal: AbortSignal.timeout(45000),
    });
    revalidated = r.ok;
    log(`Cache   : revalidate-tag ${r.ok ? "ok" : "HTTP " + r.status} (${base})`);
  } catch (e) {
    log(`Cache   : revalidate FAILED (${e.message}) — run: curl "${base}/api/revalidate-tag?tag=${partner.id}"`);
  }
}

// 9. review sheet
const slug = (partner.username || partner.store_name || "partner")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const SHEET = opt("--sheet", path.join(process.cwd(), `menu-images-${slug}.html`));

const { menu: after } = await gql(MENU_Q, { p: partner.id });
const newIds = new Set(updates.map((u) => u.where.id._eq));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
const card = (m) => {
  const isNew = newIds.has(m.id);
  const img = m.image_url
    ? `<a href="${esc(m.image_url)}" target="_blank"><img src="${esc(m.image_url)}" loading="lazy" style="width:100%;height:130px;object-fit:cover;display:block;background:#2a2a2c"></a>`
    : `<div style="height:130px;display:flex;align-items:center;justify-content:center;color:#666;font-size:11px;background:#2a2a2c">no image</div>`;
  return `<div style="background:#1a1a1c;border-radius:6px;overflow:hidden;${isNew ? "outline:2px solid #4ade80" : ""}">${img}<div style="padding:5px 7px"><div style="font-size:11px;font-weight:600">${esc(m.name)}</div><div style="font-size:10px;color:#888">${esc(m.category?.name || "")}</div>${isNew ? '<div style="font-size:9px;color:#4ade80">NEW</div>' : ""}</div></div>`;
};

fs.writeFileSync(
  SHEET,
  `<!doctype html><meta charset=utf-8><title>${esc(partner.store_name)} — menu images</title>
<body style="background:#0f0f10;color:#eaeaea;font:13px/1.4 system-ui,sans-serif;margin:0;padding:16px">
<h1 style="font-size:18px;margin:0 0 4px">${esc(partner.store_name)}</h1>
<p style="color:#999;margin:0 0 14px">${after.length} items &middot; ${affected} newly imaged (outlined green) &middot; ${fromBank.length} from the image bank &middot; ${uploadedByName.size} from search${skippedNonFood.length ? ` &middot; ${skippedNonFood.length} non-food skipped` : ""}</p>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${after.map(card).join("")}</div>
</body>`
);

const stillMissing = after.filter(isEmpty).length;
const summary = {
  partner: partner.store_name,
  partner_id: partner.id,
  total: after.length,
  targeted: targets.length,
  from_bank: fromBank.length,
  from_search: uploadedByName.size,
  rows_updated: affected,
  bank_rows: bankRows,
  engines: { ...engineUsed },
  not_unique: notUnique,
  duplicate_groups_fixed: dupeGroups.length,
  revalidated,
  still_missing: stillMissing,
  skipped_non_food: skippedNonFood.map((m) => m.name),
  failed: searchNames.filter((n) => !uploadedByName.has(n)),
  sheet: SHEET,
  seconds: +((Date.now() - t0) / 1000).toFixed(1),
};

if (JSON_ONLY) console.log(JSON.stringify(summary, null, 1));
else {
  log(`Sheet   : ${SHEET}`);
  log(
    `\nDone in ${summary.seconds}s — ${affected} imaged, ${stillMissing} still without an image.`
  );
  if (summary.failed.length)
    log(`No image found: ${summary.failed.join(", ")}`);
}
