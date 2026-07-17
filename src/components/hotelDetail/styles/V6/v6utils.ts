// Pure helpers for the V6 ("Grocery") style — no React / side effects.

/** The V6 theme font — Bricolage Grotesque (loaded globally as --font-bricolage). */
export const V6_FONT = "var(--font-bricolage), 'Bricolage Grotesque', system-ui, -apple-system, sans-serif";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6).padEnd(6, "0"), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

/** Stable small integer hash of a string (deterministic across renders/SSR). */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * A soft category-tile gradient derived from the partner's accent, with a
 * per-category hue rotation so tiles look varied/colourful (like the reference
 * illustrated tiles) while staying on-brand. Deterministic for a given key, so
 * server and client render identically. Returns a CSS `background` value.
 */
export function accentTileGradient(accent: string, key: string): string {
  let h: number, s: number, l: number;
  try {
    const [hh, ss, ll] = rgbToHsl(...hexToRgb(accent));
    h = hh; s = ss; l = ll;
  } catch {
    h = 145; s = 0.6; l = 0.4;
  }
  // Rotate hue by a deterministic offset in [-45°, +45°] based on the category.
  const offset = (hashString(key) % 91) - 45;
  const hue = (h + offset + 360) % 360;
  // Keep tints soft: bounded saturation, high lightness.
  const sat = Math.min(0.7, Math.max(0.35, s)) * 100;
  const top = `hsl(${hue} ${sat}% 88%)`;
  const mid = `hsl(${hue} ${sat}% 94%)`;
  return `linear-gradient(140deg, ${top} 0%, ${mid} 55%, #ffffff 100%)`;
}

/**
 * A tiling food-doodle (line-art) pattern as a CSS `url(...)` value, stroked in
 * the given colour. Used as a subtle page-background watermark on the storefront.
 */
export function foodDoodleUrl(color: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='120' viewBox='0 0 150 120' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>` +
    `<path d='M18 40h20v12a10 10 0 0 1-20 0z'/><path d='M38 42a6 6 0 0 1 0 10'/><path d='M23 34q3-5 0-10M31 34q3-5 0-10'/>` +
    `<circle cx='95' cy='24' r='9'/><path d='M86 30l9 22 9-22'/>` +
    `<path d='M20 88a18 10 0 0 1 36 0z'/><path d='M22 94h32M24 99h28'/><path d='M20 100a18 8 0 0 0 36 0'/>` +
    `<circle cx='115' cy='88' r='15'/><circle cx='115' cy='88' r='6'/>` +
    `<path d='M132 18v30M128 18v9M136 18v9M128 27h8'/><path d='M147 18v30M147 18c-4 4-4 12 0 15'/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
