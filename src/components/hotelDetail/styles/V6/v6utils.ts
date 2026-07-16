// Pure helpers for the V6 ("Grocery") style — no React / side effects.

/** The V6 theme font — Poppins (loaded globally as --font-poppins in layout.tsx). */
export const V6_FONT = "var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif";

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
