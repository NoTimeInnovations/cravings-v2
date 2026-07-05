import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to the Menuthere Image DB (menuthere-image-db.vercel.app).
 *
 * Keeps IMAGE_DB_API_KEY server-only so it is never shipped in the client
 * bundle. The admin UI (menu management "Get all images" + the image gallery)
 * calls this same-origin route, which forwards to the image bank with the key.
 *
 *   GET /api/image-bank?item=biryani&limit=24
 *   -> { images: [{ item_name, category_name, image_url, partner_name }], total }
 */

export const dynamic = "force-dynamic";

const IMAGE_DB_URL =
  process.env.IMAGE_DB_URL || "https://imagedb.menuthere.com";
const IMAGE_DB_API_KEY = process.env.IMAGE_DB_API_KEY || "";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const item = (sp.get("item") || "").trim();
  const limit = sp.get("limit") || "24";
  const category = (sp.get("category") || "").trim();

  if (!item && !category) {
    return NextResponse.json({ images: [], total: 0 });
  }

  const qs = new URLSearchParams();
  if (item) qs.set("item", item);
  if (category) qs.set("category", category);
  qs.set("limit", limit);

  try {
    const res = await fetch(`${IMAGE_DB_URL}/api/images?${qs.toString()}`, {
      headers: IMAGE_DB_API_KEY ? { "x-api-key": IMAGE_DB_API_KEY } : {},
      cache: "no-store",
    });
    if (!res.ok) {
      // Degrade gracefully so callers can fall back to the google scraper.
      return NextResponse.json({ images: [], total: 0, error: `image-db ${res.status}` });
    }
    const data = await res.json();
    return NextResponse.json({
      images: Array.isArray(data.images) ? data.images : [],
      total: data.total ?? 0,
    });
  } catch (e) {
    return NextResponse.json({
      images: [],
      total: 0,
      error: e instanceof Error ? e.message : "image-bank fetch failed",
    });
  }
}
