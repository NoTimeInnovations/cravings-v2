import {
  StorefrontConfig,
  HeroSection,
  FeaturedItemsSection,
  ReviewsSection,
  AboutSection,
  CustomSection,
} from "@/types/storefront";
import { StorefrontNavbar } from "@/components/storefront/display/StorefrontNavbar";
import { HeroDisplay } from "@/components/storefront/display/HeroDisplay";
import { FeaturedItemsDisplay } from "@/components/storefront/display/FeaturedItemsDisplay";
import { ReviewsDisplay } from "@/components/storefront/display/ReviewsDisplay";
import { AboutDisplay } from "@/components/storefront/display/AboutDisplay";
import { CustomSectionDisplay } from "@/components/storefront/display/CustomSectionDisplay";
import { StorefrontFooter } from "@/components/storefront/display/StorefrontFooter";

interface PartnerData {
  id: string;
  username: string;
  store_name: string;
  store_banner?: string;
  description?: string;
  phone?: string;
  location?: string;
  location_details?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

interface Props {
  partner: PartnerData;
  config: StorefrontConfig;
  menuItems: MenuItem[];
}

const FONT_CLASS: Record<string, string> = {
  modern: "font-sans",
  classic: "font-serif",
  minimal: "font-sans tracking-tight",
};

export default function StorefrontPage({ partner, config, menuItems }: Props) {
  const primary = config.theme.primary_color;
  const fontClass = FONT_CLASS[config.theme.font_style] || "font-sans";
  const menuUrl = `/${partner.username}`;

  const enabledSections = config.sections.filter((s) => s.enabled);

  return (
    <div
      className={`min-h-screen bg-background ${fontClass}`}
      style={{ ["--storefront-primary" as string]: primary } as React.CSSProperties}
    >
      <StorefrontNavbar
        partner={partner}
        primaryColor={primary}
        menuUrl={menuUrl}
      />
      <main className="pt-14 md:pt-16">
        {enabledSections.map((section, idx) => {
          switch (section.type) {
            case "hero":
              return (
                <HeroDisplay
                  key={section.id}
                  section={section as HeroSection}
                  primaryColor={primary}
                  defaultCtaLink={menuUrl}
                />
              );
            case "featured_items":
              return (
                <FeaturedItemsDisplay
                  key={section.id}
                  section={section as FeaturedItemsSection}
                  menuItems={menuItems}
                  primaryColor={primary}
                  menuUrl={menuUrl}
                />
              );
            case "reviews":
              return (
                <ReviewsDisplay
                  key={section.id}
                  section={section as ReviewsSection}
                  primaryColor={primary}
                />
              );
            case "about":
              return (
                <AboutDisplay
                  key={section.id}
                  section={section as AboutSection}
                />
              );
            case "custom":
              return (
                <CustomSectionDisplay
                  key={section.id}
                  section={section as CustomSection}
                  sectionIndex={idx}
                  primaryColor={primary}
                />
              );
            default:
              return null;
          }
        })}
      </main>
      <StorefrontFooter partner={partner} />
    </div>
  );
}
