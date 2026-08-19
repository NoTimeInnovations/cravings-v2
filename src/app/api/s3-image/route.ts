import { NextResponse } from "next/server";

/**
 * Re-serve one of OUR OWN S3 images from this origin.
 *
 * The banner editor draws the image onto a canvas and exports it with
 * toDataURL(). Drawing a cross-origin image taints the canvas and makes that
 * export throw — and the bucket sends no Access-Control-Allow-Origin, so
 * `crossOrigin="anonymous"` would make the image fail to load outright rather
 * than fix it. Proxying through this route makes it same-origin, so the canvas
 * stays clean.
 *
 * Deliberately NOT a general image proxy: it only serves the configured bucket.
 * An open `?url=` fetcher is a server-side request forgery hole — it would let a
 * caller reach internal addresses through our server.
 */

const BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET;
const REGION = process.env.NEXT_PUBLIC_S3_REGION;

/** Both the virtual-hosted and path-style forms AWS may hand back. */
function isOurBucket(u: URL): boolean {
  if (u.protocol !== "https:") return false;
  if (!BUCKET) return false;
  const host = u.hostname.toLowerCase();
  const vhost = REGION
    ? `${BUCKET}.s3.${REGION}.amazonaws.com`
    : `${BUCKET}.s3.amazonaws.com`;
  if (host === vhost || host === `${BUCKET}.s3.amazonaws.com`) return true;
  // Path-style: s3.<region>.amazonaws.com/<bucket>/<key>
  const pathStyle =
    /^s3([.-][a-z0-9-]+)?\.amazonaws\.com$/.test(host) &&
    u.pathname.startsWith(`/${BUCKET}/`);
  return pathStyle;
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "url is not valid" }, { status: 400 });
  }

  if (!isOurBucket(target)) {
    return NextResponse.json(
      { error: "only this store's own images can be served here" },
      { status: 403 },
    );
  }

  try {
    const upstream = await fetch(target.toString(), { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `upstream responded ${upstream.status}` },
        { status: 502 },
      );
    }
    const type = upstream.headers.get("content-type") || "";
    // The editor only ever asks for images; anything else is not ours to relay.
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 415 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": type,
        // Short: the editor fetches it once, and a stale logo here would be
        // confusing right after someone replaced it.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "could not fetch the image" }, { status: 502 });
  }
}
