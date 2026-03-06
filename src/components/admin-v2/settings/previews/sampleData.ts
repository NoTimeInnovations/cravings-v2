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
