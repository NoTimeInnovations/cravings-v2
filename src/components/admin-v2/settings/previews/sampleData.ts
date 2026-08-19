import * as React from "react";

export interface PreviewStyles {
  backgroundColor: string;
  color: string;
  accent: string;
  showGrid?: boolean;
  border: {
    borderColor: string;
    borderWidth: string;
    borderStyle: string;
  };
}

export interface PreviewProps {
  styles: PreviewStyles;
  fontFamily: string;
  showGrid: boolean;
}

export const STORE_NAME = "Your Store";
export const STORE_LOCATION = "Downtown, City";

export const SAMPLE_CATEGORIES = [
  { id: "must-try", name: "Must Try" },
  { id: "starters", name: "Starters" },
  { id: "main", name: "Main Course" },
  { id: "desserts", name: "Desserts" },
];

export const SAMPLE_ITEMS = [
  { id: "1", name: "Margherita Pizza", price: "249", category: "starters", hasImage: true },
  { id: "2", name: "Caesar Salad", price: "199", category: "starters", hasImage: true },
  { id: "3", name: "Pasta Alfredo", price: "349", category: "main", hasImage: false },
  { id: "4", name: "Grilled Chicken", price: "399", category: "main", hasImage: true },
  { id: "5", name: "Tiramisu", price: "179", category: "desserts", hasImage: true },
  { id: "6", name: "Chocolate Cake", price: "149", category: "desserts", hasImage: false },
  { id: "7", name: "Spring Rolls", price: "129", category: "starters", hasImage: true },
  { id: "8", name: "Butter Naan", price: "59", category: "main", hasImage: true },
  { id: "9", name: "Ice Cream", price: "99", category: "desserts", hasImage: true },
];

export const MUST_TRY_ITEMS = SAMPLE_ITEMS.filter((_, i) => i < 3);

/* ------------------------------------------------------- injectable data */

/**
 * What the previews render.
 *
 * They used to import SAMPLE_* directly, which meant every layout preview was a
 * picture of a fictional store. admin-v3 shows the partner their OWN menu, so
 * the data is injected instead — with the samples as the default, which is what
 * keeps admin-v2's Theme settings rendering exactly as before.
 */
export interface PreviewItem {
  id: string;
  name: string;
  price: string;
  category: string;
  hasImage: boolean;
  /** Real image URL when the partner has one; the icon placeholder otherwise. */
  image?: string;
  description?: string;
}

export interface PreviewData {
  storeName: string;
  storeLocation: string;
  /** Partner logo, drawn in place of the utensils badge when present. */
  logoUrl?: string;
  /** Currency symbol — the samples are rupees, a real store may not be. */
  currency: string;
  categories: { id: string; name: string }[];
  items: PreviewItem[];
  mustTry: PreviewItem[];
}

export const DEFAULT_PREVIEW_DATA: PreviewData = {
  storeName: STORE_NAME,
  storeLocation: STORE_LOCATION,
  currency: "\u20B9",
  categories: SAMPLE_CATEGORIES,
  items: SAMPLE_ITEMS,
  mustTry: MUST_TRY_ITEMS,
};

const PreviewDataContext = React.createContext<PreviewData>(DEFAULT_PREVIEW_DATA);

export const PreviewDataProvider = PreviewDataContext.Provider;

/** The data the surrounding screen injected, or the samples. */
export function usePreviewData(): PreviewData {
  return React.useContext(PreviewDataContext);
}

/**
 * Categories that actually contain items, paired with those items.
 *
 * The previews used to hardcode the sample ids ("starters", "main"). That was
 * invisible while the data was always the samples, but a real store's category
 * ids are uuids — every section matched nothing and rendered its heading above
 * an empty space. Sections are derived from real membership instead.
 */
export function previewSections(
  data: PreviewData,
  max = 2,
  perCat = 99,
): { cat: { id: string; name: string }; items: PreviewItem[] }[] {
  const out: { cat: { id: string; name: string }; items: PreviewItem[] }[] = [];
  for (const cat of data.categories) {
    const items = data.items.filter((i) => i.category === cat.id);
    if (items.length > 0) out.push({ cat, items: items.slice(0, perCat) });
    if (out.length >= max) break;
  }
  // Last resort: ids out of step with the items. Showing them ungrouped still
  // demonstrates the layout, which an empty phone does not.
  if (out.length === 0 && data.items.length > 0) {
    out.push({
      cat: data.categories[0] ?? { id: "all", name: "Menu" },
      items: data.items.slice(0, perCat),
    });
  }
  return out;
}

/**
 * A dish thumbnail: the real photo when the item has one, the tinted utensils
 * badge otherwise. Kept here so all seven layouts fall back identically.
 *
 * Written with React.createElement rather than JSX because this module is .ts —
 * every preview already imports from it, and a .tsx rename would churn them all.
 */
export function previewThumbStyle(
  styles: PreviewStyles,
  radius: string,
): React.CSSProperties {
  return {
    backgroundColor: blendColor(styles.accent, styles.backgroundColor, 0.12),
    borderRadius: radius,
  };
}

/** Blend a foreground hex color onto a background hex color at a given opacity (0-1). Returns a solid opaque hex. */
export function blendColor(fg: string, bg: string, opacity: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  try {
    const [fr, fg2, fb] = parse(fg);
    const [br, bg2, bb] = parse(bg);
    const r = Math.round(fr * opacity + br * (1 - opacity));
    const g = Math.round(fg2 * opacity + bg2 * (1 - opacity));
    const b = Math.round(fb * opacity + bb * (1 - opacity));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return bg;
  }
}
