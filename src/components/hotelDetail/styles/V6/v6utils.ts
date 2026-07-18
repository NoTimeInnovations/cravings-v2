// Pure helpers for the V6 ("Grocery") style — no React / side effects.

/**
 * The V6 theme font. Reads the per-partner `--v6-font` CSS variable when set
 * (see menuFontStack + V6's surface effect), otherwise falls back to the default
 * Bricolage Grotesque (loaded globally as --font-bricolage). Because it's applied
 * to the V6 root AND every bottom-sheet, flipping that one variable re-fonts the
 * whole theme — including the body-portaled sheets.
 */
export const V6_FONT =
  "var(--v6-font, var(--font-bricolage), 'Bricolage Grotesque', system-ui, -apple-system, sans-serif)";

/** Font stacks a partner can opt into via theme.fontFamily (must be loaded in layout.tsx). */
const MONTSERRAT_STACK =
  "var(--font-montserrat), 'Montserrat', system-ui, -apple-system, sans-serif";

/**
 * Resolve a partner's `theme.fontFamily` to a concrete font stack for V6.
 * Returns undefined for the default / "sans-serif" / anything unrecognised, so
 * V6 keeps its Bricolage default — only explicitly loaded fonts may override.
 */
export function menuFontStack(fontFamily?: string | null): string | undefined {
  switch ((fontFamily || "").trim().toLowerCase()) {
    case "montserrat":
      return MONTSERRAT_STACK;
    default:
      return undefined;
  }
}

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
 * A partner's brand text colour ("ink") for V6, or null when it's the default
 * near-black (so stores that never set a text colour stay exactly as before).
 * Pairs with the `[data-menu-ink]` rules in globals.css, which remap V6's grey
 * text scale onto this colour; accent-coloured text uses inline styles and is
 * intentionally left untouched.
 */
export function menuInk(textColor?: string | null): string | null {
  const c = (textColor || "").trim().toLowerCase();
  if (!c || ["#000", "#000000", "#111", "#111827", "#1a1a1a", "black"].includes(c)) {
    return null;
  }
  return textColor as string;
}

/** A softer tint of the ink (mixed ~42% toward white) for muted / secondary text. */
export function softInk(hex: string): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    const mix = (v: number) => Math.round(v + (255 - v) * 0.42);
    return "#" + [mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
  } catch {
    return hex;
  }
}
