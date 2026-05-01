import Link from "next/link";
import { HeroSection } from "@/types/storefront";

interface Props {
  section: HeroSection;
  primaryColor: string;
  defaultCtaLink: string;
}

export function HeroDisplay({ section, primaryColor, defaultCtaLink }: Props) {
  const ctaLink = section.cta_link || defaultCtaLink;
  const hasImage = !!section.hero_image_url;

  return (
    <section
      className="relative min-h-[600px] md:h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: hasImage ? undefined : primaryColor,
        backgroundImage: hasImage ? `url(${section.hero_image_url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {hasImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: section.overlay_opacity / 100 }}
        />
      )}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        {section.headline && (
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            {section.headline}
          </h1>
        )}
        {section.subheadline && (
          <p className="text-lg md:text-2xl text-white/80 mt-4 md:mt-6">
            {section.subheadline}
          </p>
        )}
        <Link
          href={ctaLink}
          className="inline-flex items-center rounded-full px-8 md:px-10 py-3 md:py-4 text-base md:text-lg font-medium text-white mt-8 transition-transform hover:scale-105"
          style={{ backgroundColor: primaryColor }}
        >
          {section.cta_text || "Order Now"}
        </Link>
      </div>
    </section>
  );
}
