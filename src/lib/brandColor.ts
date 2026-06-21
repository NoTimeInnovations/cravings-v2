export type BrandColorPreset = {
    id: string;
    name: string;
    hex: string;
};

export const BRAND_COLORS: BrandColorPreset[] = [
    { id: "burnt-orange", name: "Burnt Orange", hex: "#e85d04" },
    { id: "obsidian-gold", name: "Obsidian Gold", hex: "#b8860b" },
    { id: "royal-burgundy", name: "Royal Burgundy", hex: "#8b1a4a" },
    { id: "midnight-emerald", name: "Midnight Emerald", hex: "#0d6b4e" },
    { id: "sapphire", name: "Sapphire", hex: "#1e4db7" },
    { id: "charcoal-noir", name: "Charcoal Noir", hex: "#2c2c2c" },
    { id: "deep-violet", name: "Deep Violet", hex: "#6b21a8" },
    { id: "rose-blush", name: "Rose Blush", hex: "#be185d" },
    { id: "teal-luxe", name: "Teal Luxe", hex: "#0f766e" },
    { id: "warm-copper", name: "Warm Copper", hex: "#b45309" },
];

export const BRAND_COLOR_MAP: Record<string, string> = BRAND_COLORS.reduce(
    (acc, c) => {
        acc[c.id] = c.hex;
        return acc;
    },
    {} as Record<string, string>,
);

export const DEFAULT_BRAND_COLOR_ID = "burnt-orange";
export const DEFAULT_BRAND_COLOR_HEX = "#e85d04";

/**
 * Convert a stored brand-color token ("burnt-orange" | "custom:#abc123")
 * into a hex string. Returns the default if the token is missing / invalid.
 */
export function brandColorToHex(token?: string | null): string {
    if (!token) return DEFAULT_BRAND_COLOR_HEX;
    if (token.startsWith("custom:")) {
        const hex = token.slice("custom:".length).trim();
        return hex || DEFAULT_BRAND_COLOR_HEX;
    }
    return BRAND_COLOR_MAP[token] || DEFAULT_BRAND_COLOR_HEX;
}

/**
 * Resolve the partner's brand color token, preferring `theme.brandColor`
 * with a fallback to legacy `storefront.brandColor`. Always returns a token,
 * never a hex — use `brandColorToHex()` to render.
 */
export function resolveBrandColorToken(
    theme?: { brandColor?: string | null } | null,
    storefront?: { brandColor?: string | null } | null,
): string {
    return (
        theme?.brandColor ||
        storefront?.brandColor ||
        DEFAULT_BRAND_COLOR_ID
    );
}

/**
 * One-shot: token → hex with theme-then-storefront precedence.
 */
export function resolveBrandColorHex(
    theme?: { brandColor?: string | null } | null,
    storefront?: { brandColor?: string | null } | null,
): string {
    return brandColorToHex(resolveBrandColorToken(theme, storefront));
}

/**
 * Pick a readable foreground color for text/icons placed on top of `bgHex`.
 * Uses YIQ perceived brightness: dark backgrounds get white text, light
 * backgrounds get near-black text. Accepts #rgb or #rrggbb (with/without `#`).
 */
export function readableTextColor(
    bgHex?: string | null,
    onDark = "#ffffff",
    onLight = "#111827",
): string {
    if (!bgHex) return onDark;
    let h = bgHex.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6) return onDark;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return onDark;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? onLight : onDark;
}
