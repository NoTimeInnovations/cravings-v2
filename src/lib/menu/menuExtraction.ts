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
 *   1. Turn every input into a compressed JPEG "page" (images are downscaled;
 *      PDFs are rendered page-by-page with pdfjs) — this both shrinks the payload
 *      and satisfies "if it's a PDF, convert to images".
 *   2. Group pages into batches whose total base64 size stays comfortably under
 *      the request cap (size-based, not just a fixed count).
 *   3. Call the AI once per batch (with retries), then merge + de-dupe the items.
 * A batch that fails after its retries is skipped so the rest still succeed
 * (partial success is reported back).
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
  /** Extra free-text hint appended to the prompt (e.g. "treat Loaded Fries as a category"). */
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
const IMAGE_MAX_DIM = 1600; // long-edge px — enough for OCR, keeps JPEG small
// Base64 budget per request. base64 ≈ 1.37× bytes, so ~3.4M chars ≈ ~2.5MB of
// image data; well under the ~4.5MB route-handler body cap (leaves room for the
// prompt/schema/JSON overhead).
const MAX_BATCH_B64 = 3_400_000;
const MAX_BATCH_COUNT = 5; // also cap page count per call for latency/accuracy
const MAX_PDF_PAGES = 80; // guard against a runaway huge PDF
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_MS = 1500;
const JPEG_QUALITIES = [0.82, 0.68, 0.55, 0.42];

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

const DEFAULT_PROMPT = `Extract each distinct dish as a separate item from the provided menu pages (images).
A 'variant' applies ONLY to different sizes/quantities of the SAME item (e.g., Quarter/Half/Full, Small/Regular/Large, 2pc/4pc). If an item has no such size options, omit the 'variants' field. Different dishes (e.g., 'Fresh Lime' vs 'Mint Lime') are separate items, NOT variants.
For each item provide:
- name: the dish name.
- price: the item's price (the lowest variant price if variants exist). Must be a number greater than zero; use 1 if no price is shown.
- description: a short appetising sentence (max 10 words).
- category: the heading/section the item is listed under (use the nearest section title; if none, use "Menu").
- variants: (optional) array of { name, price } for sizes only, in ascending price order.
Do not invent items. Return ONLY items you can see on these pages.`;

// ---- Small helpers ---------------------------------------------------------
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
      const scale = Math.max(
        0.5,
        Math.min(2, IMAGE_MAX_DIM / Math.max(base.width, base.height)),
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
      if (attempt < maxRetries) await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Batch extraction failed");
}

/** Normalise + de-dupe (same name+price+category across overlapping pages). */
function mergeItems(items: ExtractedMenuItem[]): ExtractedMenuItem[] {
  const seen = new Set<string>();
  const out: ExtractedMenuItem[] = [];
  for (const it of items) {
    const name = String(it?.name ?? "").trim();
    if (!name) continue;
    const price =
      typeof it.price === "number" && !isNaN(it.price)
        ? it.price
        : Number(it.price) || 0;
    const category = String(it?.category ?? "Menu").trim() || "Menu";
    const key = `${name.toLowerCase()}|${price}|${category.toLowerCase()}`;
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
  const finalPrompt = extraContext?.trim()
    ? `${prompt}\nExtra context from the user: ${extraContext.trim()}`
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

  // ---- Phase 2: batch + extract ----
  const batches = batchParts(parts);
  const all: ExtractedMenuItem[] = [];
  let failedBatches = 0;

  for (let i = 0; i < batches.length; i++) {
    throwIfAborted(signal);
    onProgress?.({
      phase: "extracting",
      pagesReady: parts.length,
      batchesDone: i,
      totalBatches: batches.length,
    });
    try {
      const items = await runBatch(batches[i], model, finalPrompt, schema, maxRetries, signal);
      all.push(...items);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      console.error(`menu batch ${i + 1}/${batches.length} failed`, err);
      failedBatches++;
    }
  }

  onProgress?.({
    phase: "extracting",
    pagesReady: parts.length,
    batchesDone: batches.length,
    totalBatches: batches.length,
  });

  return {
    items: mergeItems(all),
    totalPages: parts.length,
    totalBatches: batches.length,
    failedBatches,
    unsupportedFiles,
    truncatedPdf,
  };
}
