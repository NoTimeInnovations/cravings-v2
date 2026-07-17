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
 * A dense tiling food-doodle (line-art) pattern as a CSS `url(...)` value,
 * stroked in the given colour — recognizable food icons (coffee, ice-cream,
 * burger, donut, soda, pizza, cupcake, fish, cookie, apple). Used as a subtle
 * page-background watermark on the storefront.
 */
export function foodDoodleUrl(color: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='160' viewBox='0 0 220 160' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>` +
    // coffee cup
    `<path d='M14 24h16v9a8 8 0 0 1-16 0z'/><path d='M30 26a5 5 0 0 1 0 8'/><path d='M18 18q2-4 0-7M25 18q2-4 0-7'/>` +
    // ice-cream cone
    `<circle cx='58' cy='18' r='8'/><path d='M50 24l8 26 8-26'/><path d='M53 28l10 7M58 25l6 13'/>` +
    // burger
    `<path d='M92 32a16 8 0 0 1 32 0z'/><path d='M92 35h32M94 41h28'/><path d='M92 43a16 7 0 0 0 32 0'/>` +
    // donut
    `<circle cx='150' cy='30' r='13'/><circle cx='150' cy='30' r='5'/><path d='M145 24l1 3M154 26l1 3M147 36l1 3M156 35l1 3'/>` +
    // soda cup + straw
    `<path d='M182 22l3 26h11l3-26z'/><path d='M180 22h20'/><path d='M194 22l2-12'/>` +
    // pizza slice
    `<path d='M18 96l11 40 11-40'/><path d='M18 96a13 4 0 0 1 22 0'/><circle cx='25' cy='106' r='2'/><circle cx='33' cy='110' r='2'/><circle cx='29' cy='118' r='2'/>` +
    // cupcake
    `<path d='M58 116l3 22h16l3-22z'/><path d='M65 116v22M72 116v22'/><path d='M56 116a13 8 0 0 1 26 0M60 110a9 6 0 0 1 18 0M65 105a5 4 0 0 1 10 0'/><circle cx='70' cy='103' r='2'/>` +
    // fish
    `<ellipse cx='115' cy='114' rx='15' ry='8'/><path d='M130 114l8-7v14z'/><circle cx='108' cy='110' r='1.5'/>` +
    // cookie
    `<circle cx='165' cy='112' r='11'/><circle cx='161' cy='108' r='1.3'/><circle cx='169' cy='111' r='1.3'/><circle cx='163' cy='116' r='1.3'/><circle cx='168' cy='115' r='1.3'/>` +
    // apple
    `<path d='M196 120a8 8 0 0 1-8-8c0-5 4-7 8-5 4-2 8 0 8 5a8 8 0 0 1-8 8z'/><path d='M196 104v-3M196 102q4-2 6 1'/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
