export interface WebsiteHeroConfig {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  headline_accent: string;
  subheadline: string;
  cta_text: string;
  cta_link: string;
  collage_images: string[];
  collage_labels: string[];
  hours_label: string;
  hours_value: string;
  address_label: string;
  address_value: string;
}

export interface WebsiteMarqueeConfig {
  enabled: boolean;
  tags: { text: string; accent: boolean }[];
}

export interface WebsiteStoryConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  title_accent: string;
  paragraphs: string[];
  image_url: string;
  image_label: string;
}

export interface WebsiteMenuConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  title_accent: string;
  category_ids: string[];
  item_ids_by_category: Record<string, string[]>;
  note: string;
  cta_text: string;
}

export interface WebsiteHoursRow {
  label: string;
  value: string;
}

export interface WebsiteVisitConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  title_accent: string;
  address_lines: string;
  address_note: string;
  hours: WebsiteHoursRow[];
  getting_here: string;
  contact_phone: string;
  contact_email: string;
  map_image_url: string;
  map_link: string;
}

export interface WebsiteReviewItem {
  author_name: string;
  author_url: string;
  profile_photo_url: string;
  rating: number;
  relative_time: string;
  text: string;
}

export interface BrilaQuoteAuthor {
  name: string;
  photo_url: string;
}

export interface BrilaFeatureCard {
  title: string;
  description: string;
  quote: string;
  author: BrilaQuoteAuthor;
}

export interface BrilaDishCard {
  name: string;
  quote: string;
  author: BrilaQuoteAuthor;
}

export interface BrilaSpecialCard {
  title: string;
  description: string;
}

export interface BrilaTipCard {
  emoji: string;
  title: string;
  description: string;
}

export interface BrilaGalleryItem {
  image_url: string;
  caption: string;
}

export interface WebsiteWhyChooseUsConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: BrilaFeatureCard[];
}

export interface WebsiteGalleryConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: BrilaGalleryItem[];
}

export interface WebsiteMostOrderedConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: BrilaDishCard[];
}

export interface WebsiteMoreFavoritesConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: BrilaDishCard[];
}

export interface WebsiteSpecialTouchesConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: BrilaSpecialCard[];
}

export interface WebsiteTipsConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  items: BrilaTipCard[];
}

export interface WebsiteReviewsConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  title_accent: string;
  rating: number;
  total_ratings: number;
  source_label: string;
  items: WebsiteReviewItem[];
}

export interface WebsitePolicyLink {
  label: string;
  url: string;
}

export interface WebsiteFooterConfig {
  enabled: boolean;
  policies: WebsitePolicyLink[];
  copyright: string;
}

export interface WebsiteTheme {
  bg_color: string;
  ink_color: string;
}

export type WebsiteLayout = "default" | "brila";

export interface WebsiteConfig {
  enabled: boolean;
  layout: WebsiteLayout;
  theme: WebsiteTheme;
  hero: WebsiteHeroConfig;
  marquee: WebsiteMarqueeConfig;
  story: WebsiteStoryConfig;
  reviews: WebsiteReviewsConfig;
  menu: WebsiteMenuConfig;
  visit: WebsiteVisitConfig;
  footer: WebsiteFooterConfig;
  why_choose_us: WebsiteWhyChooseUsConfig;
  gallery: WebsiteGalleryConfig;
  most_ordered: WebsiteMostOrderedConfig;
  more_favorites: WebsiteMoreFavoritesConfig;
  special_touches: WebsiteSpecialTouchesConfig;
  tips: WebsiteTipsConfig;
}

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  enabled: false,
  layout: "default",
  theme: {
    bg_color: "#FFFFFF",
    ink_color: "#1A1714",
  },
  hero: {
    enabled: true,
    eyebrow: "",
    headline: "",
    headline_accent: "",
    subheadline: "",
    cta_text: "Order online",
    cta_link: "",
    collage_images: ["", "", "", ""],
    collage_labels: ["", "", "", ""],
    hours_label: "Hours",
    hours_value: "",
    address_label: "Address",
    address_value: "",
  },
  marquee: {
    enabled: true,
    tags: [],
  },
  story: {
    enabled: true,
    eyebrow: "Our story",
    title: "",
    title_accent: "",
    paragraphs: [""],
    image_url: "",
    image_label: "",
  },
  reviews: {
    enabled: false,
    eyebrow: "Loved",
    title: "What guests are saying",
    title_accent: "",
    rating: 0,
    total_ratings: 0,
    source_label: "Google reviews",
    items: [],
  },
  menu: {
    enabled: true,
    eyebrow: "The menu",
    title: "",
    title_accent: "",
    category_ids: [],
    item_ids_by_category: {},
    note: "",
    cta_text: "See full menu",
  },
  visit: {
    enabled: true,
    eyebrow: "Visit",
    title: "",
    title_accent: "",
    address_lines: "",
    address_note: "",
    hours: [
      { label: "Mon – Tue", value: "" },
      { label: "Wed – Thu", value: "" },
      { label: "Fri – Sat", value: "" },
      { label: "Sunday", value: "" },
    ],
    getting_here: "",
    contact_phone: "",
    contact_email: "",
    map_image_url: "",
    map_link: "",
  },
  footer: {
    enabled: true,
    policies: [],
    copyright: "",
  },
  why_choose_us: {
    enabled: false,
    eyebrow: "Highlights",
    title: "What sets us apart",
    subtitle: "",
    items: [],
  },
  gallery: {
    enabled: false,
    eyebrow: "Gallery",
    title: "A look inside",
    subtitle: "",
    items: [],
  },
  most_ordered: {
    enabled: false,
    eyebrow: "Favourites",
    title: "Crowd favourites",
    subtitle: "The dishes guests come back for.",
    items: [],
  },
  more_favorites: {
    enabled: false,
    eyebrow: "Also loved",
    title: "Worth ordering",
    subtitle: "Other plates regulars keep going back to.",
    items: [],
  },
  special_touches: {
    enabled: false,
    eyebrow: "The extras",
    title: "Little things we do",
    subtitle: "Small details that make every visit count.",
    items: [],
  },
  tips: {
    enabled: false,
    eyebrow: "Good to know",
    title: "Insider tips",
    subtitle: "Things regulars wish they'd known on their first visit.",
    items: [],
  },
};

export function mergeWebsiteConfig(
  partial: Partial<WebsiteConfig> | null | undefined,
): WebsiteConfig {
  if (!partial) return DEFAULT_WEBSITE_CONFIG;
  return {
    ...DEFAULT_WEBSITE_CONFIG,
    ...partial,
    theme: { ...DEFAULT_WEBSITE_CONFIG.theme, ...(partial.theme || {}) },
    hero: { ...DEFAULT_WEBSITE_CONFIG.hero, ...(partial.hero || {}) },
    marquee: { ...DEFAULT_WEBSITE_CONFIG.marquee, ...(partial.marquee || {}) },
    story: { ...DEFAULT_WEBSITE_CONFIG.story, ...(partial.story || {}) },
    reviews: { ...DEFAULT_WEBSITE_CONFIG.reviews, ...(partial.reviews || {}) },
    menu: { ...DEFAULT_WEBSITE_CONFIG.menu, ...(partial.menu || {}) },
    visit: { ...DEFAULT_WEBSITE_CONFIG.visit, ...(partial.visit || {}) },
    footer: { ...DEFAULT_WEBSITE_CONFIG.footer, ...(partial.footer || {}) },
    why_choose_us: {
      ...DEFAULT_WEBSITE_CONFIG.why_choose_us,
      ...(partial.why_choose_us || {}),
    },
    gallery: {
      ...DEFAULT_WEBSITE_CONFIG.gallery,
      ...(partial.gallery || {}),
    },
    most_ordered: {
      ...DEFAULT_WEBSITE_CONFIG.most_ordered,
      ...(partial.most_ordered || {}),
    },
    more_favorites: {
      ...DEFAULT_WEBSITE_CONFIG.more_favorites,
      ...(partial.more_favorites || {}),
    },
    special_touches: {
      ...DEFAULT_WEBSITE_CONFIG.special_touches,
      ...(partial.special_touches || {}),
    },
    tips: { ...DEFAULT_WEBSITE_CONFIG.tips, ...(partial.tips || {}) },
  };
}
