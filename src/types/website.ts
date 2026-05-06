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

export interface WebsiteConfig {
  enabled: boolean;
  theme: WebsiteTheme;
  hero: WebsiteHeroConfig;
  marquee: WebsiteMarqueeConfig;
  story: WebsiteStoryConfig;
  menu: WebsiteMenuConfig;
  visit: WebsiteVisitConfig;
  footer: WebsiteFooterConfig;
}

export const DEFAULT_WEBSITE_CONFIG: WebsiteConfig = {
  enabled: false,
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
    menu: { ...DEFAULT_WEBSITE_CONFIG.menu, ...(partial.menu || {}) },
    visit: { ...DEFAULT_WEBSITE_CONFIG.visit, ...(partial.visit || {}) },
    footer: { ...DEFAULT_WEBSITE_CONFIG.footer, ...(partial.footer || {}) },
  };
}
