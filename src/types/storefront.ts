export type SectionType =
  | "hero"
  | "featured_items"
  | "reviews"
  | "about"
  | "custom";

export interface HeroSection {
  id: "hero";
  type: "hero";
  enabled: boolean;
  headline: string;
  subheadline: string;
  hero_image_url: string;
  cta_text: string;
  cta_link: string;
  overlay_opacity: number;
}

export interface FeaturedItemsSection {
  id: "featured_items";
  type: "featured_items";
  enabled: boolean;
  title: string;
  item_ids: string[];
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date?: string;
}

export interface ReviewsSection {
  id: "reviews";
  type: "reviews";
  enabled: boolean;
  title: string;
  reviews: Review[];
}

export interface AboutSection {
  id: "about";
  type: "about";
  enabled: boolean;
  title: string;
  content: string;
  image_url?: string;
}

export interface CustomSectionButton {
  text: string;
  link: string;
  new_tab: boolean;
}

export interface CustomSection {
  id: string;
  type: "custom";
  enabled: boolean;
  title?: string;
  image_url?: string;
  content: string;
  button?: CustomSectionButton;
}

export type StorefrontSection =
  | HeroSection
  | FeaturedItemsSection
  | ReviewsSection
  | AboutSection
  | CustomSection;

export interface StorefrontTheme {
  primary_color: string;
  font_style: "modern" | "classic" | "minimal";
}

export interface StorefrontSeo {
  meta_title?: string;
  meta_description?: string;
}

export interface StorefrontConfig {
  enabled: boolean;
  sections: StorefrontSection[];
  theme: StorefrontTheme;
  seo?: StorefrontSeo;
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  enabled: false,
  sections: [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      headline: "",
      subheadline: "",
      hero_image_url: "",
      cta_text: "Order Now",
      cta_link: "",
      overlay_opacity: 40,
    },
    {
      id: "featured_items",
      type: "featured_items",
      enabled: true,
      title: "Our Most Popular Items",
      item_ids: [],
    },
    {
      id: "reviews",
      type: "reviews",
      enabled: true,
      title: "What our guests are saying",
      reviews: [],
    },
    {
      id: "about",
      type: "about",
      enabled: true,
      title: "Our Story",
      content: "",
    },
  ],
  theme: {
    primary_color: "#E85D24",
    font_style: "modern",
  },
};
