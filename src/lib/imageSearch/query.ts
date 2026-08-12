/**
 * Search-query shaping for image lookups.
 *
 * Lives here, NOT in app/actions/googleImageFallback.ts, because that file is
 * `"use server"` — every export there must be an async function, since Next.js
 * treats each one as a callable Server Action and fails the build otherwise.
 * These are a plain constant and a synchronous helper, so they belong in a
 * normal module (and are unit-testable without dragging in Apify or S3).
 */

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
