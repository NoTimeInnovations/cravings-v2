"use client";

import type { Schema } from "@google/generative-ai";
import { aiGenerate, fileToBase64, type AiFile } from "@/lib/ai/generateContent";

/**
 * Robust, batched menu extraction from any number of uploaded menu files
 * (images and/or PDFs). Used by BOTH the front onboarding (`/signup-from-google`)
 * and the admin bulk upload (`/admin/bulk-menu-upload`) so a partner can upload
 * every page in one go.
 *
 * Why batching: the `/api/ai/generate` proxy is a Next.js route handler; on
 * Vercel a route-handler request body is capped at ~4.5MB. So we can't send many
 * (or large) files in one call. Instead we:
 *   1. Turn every input into a high-resolution JPEG "page" (images are
 *      downscaled to a large long-edge for OCR; PDFs are rendered page-by-page
 *      with pdfjs at high DPI) — this both bounds the payload and satisfies
 *      "if it's a PDF, convert it to images".
 *   2. Group pages into batches whose total base64 size stays comfortably under
 *      the request cap (size-based, not just a fixed count).
 *   3. Call the AI for several batches in parallel (bounded concurrency), each
 *      with retries + exponential backoff, then merge + de-dupe the items.
 *   4. If a whole batch still fails, fall back to re-reading its pages one-by-one
 *      so a single unreadable page can't lose the others.
 * Whatever succeeds is returned (partial success is reported back), and there is
 * no practical cap on how many files/pages a partner can upload.
 */

export interface ExtractedMenuItem {
  name: string;
  price: number;
  description?: string;
  category: string;
  variants?: { name: string; price: number }[];
}

export interface ExtractProgress {
  phase: "rendering" | "extracting";
  /** Pages turned into images so far (rendering phase). */
  pagesReady: number;
  /** Batches finished / total (extracting phase; total known only then). */
  batchesDone: number;
  totalBatches: number;
}

export interface ExtractOptions {
  model?: string;
  prompt?: string;
  schema?: Schema;
  /** User's custom instruction, injected at the TOP of the prompt with highest
   *  priority (overrides conflicting default rules). E.g. "ignore all drinks",
   *  "treat Loaded Fries as a category". */
  extraContext?: string;
  maxRetries?: number;
  onProgress?: (p: ExtractProgress) => void;
  signal?: AbortSignal;
}

export interface ExtractResult {
  items: ExtractedMenuItem[];
  /** Total page-images produced from all files. */
  totalPages: number;
  totalBatches: number;
  failedBatches: number;
  /** Files that were neither image nor PDF (skipped). */
  unsupportedFiles: number;
  /** True if a PDF exceeded MAX_PDF_PAGES and was truncated. */
  truncatedPdf: boolean;
}

// ---- Tuning ----------------------------------------------------------------
// Long-edge px for a rendered page. Higher = the AI can read small prices,
// variant sizes and dense sections far more reliably (the #1 cause of "it
// couldn't read my menu" is under-resolution). ~2000px is a strong OCR target
// while keeping a single JPEG page comfortably under the request budget.
const IMAGE_MAX_DIM = 2000;
// Base64 budget per request. base64 ≈ 1.37× bytes, so ~3.4M chars ≈ ~2.5MB of
// image data; well under the ~4.5MB route-handler body cap (leaves room for the
// prompt/schema/JSON overhead).
const MAX_BATCH_B64 = 3_400_000;
// Fewer pages per call = the model stays focused and misses fewer items. We run
// many such batches in parallel (see CONCURRENCY), so accuracy costs no wall-clock.
const MAX_BATCH_COUNT = 4;
// Effectively "no limit" for any real menu; only guards against a pathological
// thousand-page PDF that would exhaust browser memory while rendering.
const MAX_PDF_PAGES = 300;
// How many batches hit the AI at once. Bounded so we don't trip provider
// rate-limits, but high enough that a big multi-page menu finishes quickly.
const CONCURRENCY = 4;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_MS = 1200;
// Start high so text stays crisp; step down only if a page overflows the budget.
const JPEG_QUALITIES = [0.9, 0.8, 0.7, 0.58, 0.46];

const DEFAULT_MODEL = "gemini-2.5-flash";

const DEFAULT_SCHEMA: Schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      price: { type: "number" },
      description: { type: "string" },
      category: { type: "string" },
      variants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price: { type: "number" },
          },
          required: ["name", "price"],
        },
      },
    },
    required: ["name", "price", "description", "category"],
  },
} as Schema;

const DEFAULT_PROMPT = `You are digitising a restaurant menu from the attached page images. Extract EVERY distinct dish as its own item. Be exhaustive: read the whole page top-to-bottom including small print and multi-column layouts, and never stop early on long or dense pages.

CATEGORIES (get these right — they drive how the menu is grouped)
- category = the section heading the item sits under, worded as printed on the menu (e.g. "Starters", "Biryani", "Beverages", "Desserts").
- A section often continues across a page break. If a page begins with items but shows no heading, they still belong to the LAST heading you saw — keep using it.
- Use the SAME spelling/casing every time you repeat a category so items group together.
- If an item genuinely has no section, use "Menu".

ITEMS
- Every distinct dish is a separate item — even when two dishes share a line or a price. "Fresh Lime" and "Mint Lime" are two items, NOT variants of each other.
- price: a number greater than 0. If the dish has size options, use the LOWEST size's price here. If no price is printed, use 1.
- description: a short, appetising sentence (max 10 words). Summarise the menu's own description if present, otherwise write a natural one. Never put the price in the description.

VARIANTS (sizes/portions of the SAME dish ONLY)
- Add 'variants' only for size/quantity options of one dish: Quarter/Half/Full, Small/Regular/Large, 250ml/500ml, 2pc/4pc/8pc, Single/Double, etc.
- variants = array of { name, price } listed in ascending price order.
- OMIT 'variants' entirely when a dish has no size options.
- Different dishes, flavours, toppings or add-ons are NOT variants — make them separate items.

RULES
- Extract only what is actually printed. Never invent dishes, prices or sizes.
- Return every item visible across ALL attached pages.`;

// ---- Small helpers ---------------------------------------------------------
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

/** Run `fn` over `items` with at most `limit` in flight at once, preserving
 *  result order. Used to fan out batch extraction without hammering the AI. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  const pool = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(pool);
  return results;
}

interface PagePart {
  data: string; // base64, no data: prefix
  mimeType: string;
  b64Len: number;
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  if (ctx) {
    // Flatten transparency to white so PDF/PNG transparency doesn't render black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

function canvasToBase64Jpeg(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const done = (dataUrl: string) => resolve(dataUrl.split(",")[1] || "");
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) return done(canvas.toDataURL("image/jpeg", quality));
          const reader = new FileReader();
          reader.onloadend = () => done(String(reader.result || ""));
          reader.onerror = () => done(canvas.toDataURL("image/jpeg", quality));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality,
      );
    } catch {
      done(canvas.toDataURL("image/jpeg", quality));
    }
  });
}

/** Encode a canvas to a JPEG PagePart guaranteed to fit within `budget` base64
 *  chars, stepping quality (then scale) down until it does. */
async function encodeUnderBudget(
  canvas: HTMLCanvasElement,
  budget: number,
): Promise<PagePart> {
  for (const q of JPEG_QUALITIES) {
    const data = await canvasToBase64Jpeg(canvas, q);
    if (data.length <= budget) {
      return { data, mimeType: "image/jpeg", b64Len: data.length };
    }
  }
  // Still too big — halve the dimensions once and encode at low quality.
  const small = newCanvas(canvas.width * 0.6, canvas.height * 0.6);
  small.getContext("2d")?.drawImage(canvas, 0, 0, small.width, small.height);
  const data = await canvasToBase64Jpeg(small, 0.45);
  return { data, mimeType: "image/jpeg", b64Len: data.length };
}

async function imageFileToPart(file: File): Promise<PagePart> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(w, h)); // only downscale
    const canvas = newCanvas(w * scale, h * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await encodeUnderBudget(canvas, MAX_BATCH_B64);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// pdfjs is heavy + browser-only, so load it lazily and only when a PDF appears.
let pdfjsPromise: Promise<any> | null = null;
async function getPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      // Worker copied to /public at the pinned pdfjs-dist version.
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

async function pdfFileToParts(
  file: File,
  onPage: () => void,
  signal?: AbortSignal,
): Promise<{ parts: PagePart[]; truncated: boolean }> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const parts: PagePart[] = [];
  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
  try {
    for (let p = 1; p <= pageCount; p++) {
      throwIfAborted(signal);
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      // Render at the DPI needed to hit IMAGE_MAX_DIM on the long edge (PDF pages
      // report ~72dpi at scale 1, so this is ~2.7× for A4/Letter). Cap at 4× so a
      // tiny page isn't upscaled absurdly; floor at 0.75 to keep text legible.
      const scale = Math.max(
        0.75,
        Math.min(4, IMAGE_MAX_DIM / Math.max(base.width, base.height)),
      );
      const viewport = page.getViewport({ scale });
      const canvas = newCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        parts.push(await encodeUnderBudget(canvas, MAX_BATCH_B64));
      }
      page.cleanup?.();
      onPage();
    }
  } finally {
    doc.destroy?.();
  }
  return { parts, truncated: doc.numPages > pageCount };
}

function batchParts(parts: PagePart[]): PagePart[][] {
  const batches: PagePart[][] = [];
  let cur: PagePart[] = [];
  let curLen = 0;
  for (const p of parts) {
    const exceedsSize = curLen + p.b64Len > MAX_BATCH_B64;
    if (cur.length > 0 && (exceedsSize || cur.length >= MAX_BATCH_COUNT)) {
      batches.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(p);
    curLen += p.b64Len;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

async function runBatch(
  parts: PagePart[],
  model: string,
  prompt: string,
  schema: Schema,
  maxRetries: number,
  signal?: AbortSignal,
): Promise<ExtractedMenuItem[]> {
  const files: AiFile[] = parts.map((p) => ({ data: p.data, mimeType: p.mimeType }));
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    throwIfAborted(signal);
    try {
      const text = await aiGenerate({
        model,
        prompt,
        responseMimeType: "application/json",
        responseSchema: schema,
        files,
      });
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? (parsed as ExtractedMenuItem[]) : [];
    } catch (err) {
      lastErr = err;
      // Exponential backoff with jitter — rides out transient failures and
      // provider rate-limits (429s) without a thundering-herd retry.
      if (attempt < maxRetries) {
        await sleep(RETRY_BASE_MS * 2 ** attempt + Math.floor(Math.random() * 400));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Batch extraction failed");
}

/** Normalise + de-dupe (same name+price+category across overlapping pages).
 *  Category display is canonicalised to its first-seen spelling so that
 *  "Starters"/"STARTERS"/"starters" coming from different parallel batches all
 *  collapse into one category downstream. */
function mergeItems(items: ExtractedMenuItem[]): ExtractedMenuItem[] {
  const seen = new Set<string>();
  const catDisplay = new Map<string, string>(); // lowercased -> first-seen label
  const out: ExtractedMenuItem[] = [];
  for (const it of items) {
    const name = String(it?.name ?? "").trim();
    if (!name) continue;
    const price =
      typeof it.price === "number" && !isNaN(it.price)
        ? it.price
        : Number(it.price) || 0;
    const rawCategory = String(it?.category ?? "Menu").trim() || "Menu";
    const catLc = rawCategory.toLowerCase();
    if (!catDisplay.has(catLc)) catDisplay.set(catLc, rawCategory);
    const category = catDisplay.get(catLc)!;
    const key = `${name.toLowerCase()}|${price}|${catLc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const variants = Array.isArray(it.variants)
      ? it.variants
          .filter((v) => v && v.name)
          .map((v) => ({ name: String(v.name), price: Number(v.price) || 0 }))
      : undefined;
    out.push({
      name,
      price,
      description: String(it.description ?? ""),
      category,
      ...(variants && variants.length ? { variants } : {}),
    });
  }
  return out;
}

export async function extractMenuFromFiles(
  files: File[],
  opts: ExtractOptions = {},
): Promise<ExtractResult> {
  const {
    model = DEFAULT_MODEL,
    prompt = DEFAULT_PROMPT,
    schema = DEFAULT_SCHEMA,
    extraContext,
    maxRetries = DEFAULT_MAX_RETRIES,
    onProgress,
    signal,
  } = opts;
  // The user's custom instruction is given HIGHEST priority: it's placed first
  // and explicitly told to override any conflicting rule in the base prompt, so
  // a directive like "ignore all drinks" or "treat Combos as a category" wins.
  const finalPrompt = extraContext?.trim()
    ? `USER INSTRUCTION — HIGHEST PRIORITY. Follow this exactly. Whenever it conflicts with any rule in the task below, the USER INSTRUCTION WINS:\n"""\n${extraContext.trim()}\n"""\n\n--- TASK ---\n${prompt}`
    : prompt;

  const parts: PagePart[] = [];
  let unsupportedFiles = 0;
  let truncatedPdf = false;
  let rendered = 0; // pages turned into images so far (accurate mid-PDF)

  const reportRendering = () =>
    onProgress?.({
      phase: "rendering",
      pagesReady: rendered,
      batchesDone: 0,
      totalBatches: 0,
    });

  // ---- Phase 1: turn every file into compressed JPEG page-parts ----
  for (const file of files) {
    throwIfAborted(signal);
    try {
      if (file.type.startsWith("image/")) {
        parts.push(await imageFileToPart(file));
        rendered++;
        reportRendering();
      } else if (file.type === "application/pdf") {
        try {
          const res = await pdfFileToParts(
            file,
            () => {
              rendered++;
              reportRendering();
            },
            signal,
          );
          parts.push(...res.parts);
          truncatedPdf = truncatedPdf || res.truncated;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          // pdfjs/worker failed to render — fall back to sending the raw PDF to
          // the AI (it reads PDFs natively) when it fits the request budget.
          console.error("PDF render failed; trying native PDF fallback", file.name, err);
          const b64 = await fileToBase64(file);
          if (b64.length <= MAX_BATCH_B64) {
            parts.push({ data: b64, mimeType: "application/pdf", b64Len: b64.length });
            rendered++;
            reportRendering();
          } else {
            unsupportedFiles++;
          }
        }
      } else {
        unsupportedFiles++;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      // A single unreadable/corrupt file shouldn't sink the whole upload.
      console.error("menu file processing failed", file.name, err);
      unsupportedFiles++;
    }
  }

  if (parts.length === 0) {
    return {
      items: [],
      totalPages: 0,
      totalBatches: 0,
      failedBatches: 0,
      unsupportedFiles,
      truncatedPdf,
    };
  }

  // ---- Phase 2: batch + extract (in parallel, with per-page recovery) ----
  const batches = batchParts(parts);
  let failedBatches = 0;
  let batchesDone = 0;

  onProgress?.({
    phase: "extracting",
    pagesReady: parts.length,
    batchesDone: 0,
    totalBatches: batches.length,
  });

  const perBatch = await mapWithConcurrency(batches, CONCURRENCY, async (batch) => {
    try {
      throwIfAborted(signal);
      try {
        const items = await runBatch(batch, model, finalPrompt, schema, maxRetries, signal);
        return { items, failed: false };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        // The whole batch failed its retries. Rather than lose every page,
        // re-read them one at a time — a single unreadable page then can't
        // sink the others in the same batch.
        if (batch.length > 1) {
          const recovered: ExtractedMenuItem[] = [];
          let anyPageFailed = false;
          for (const page of batch) {
            throwIfAborted(signal);
            try {
              recovered.push(
                ...(await runBatch([page], model, finalPrompt, schema, maxRetries, signal)),
              );
            } catch (pageErr) {
              if (pageErr instanceof DOMException && pageErr.name === "AbortError") throw pageErr;
              anyPageFailed = true;
            }
          }
          // Only a total loss counts as a failed batch; a partial recovery still
          // returns whatever pages we could read.
          return { items: recovered, failed: anyPageFailed && recovered.length === 0 };
        }
        console.error("menu batch failed after retries", err);
        return { items: [] as ExtractedMenuItem[], failed: true };
      }
    } finally {
      batchesDone++;
      onProgress?.({
        phase: "extracting",
        pagesReady: parts.length,
        batchesDone,
        totalBatches: batches.length,
      });
    }
  });

  const all: ExtractedMenuItem[] = [];
  for (const r of perBatch) {
    all.push(...r.items);
    if (r.failed) failedBatches++;
  }

  return {
    items: mergeItems(all),
    totalPages: parts.length,
    totalBatches: batches.length,
    failedBatches,
    unsupportedFiles,
    truncatedPdf,
  };
}
