import Link from "next/link";
import { CustomSection } from "@/types/storefront";

interface Props {
  section: CustomSection;
  sectionIndex: number;
  primaryColor: string;
}

export function CustomSectionDisplay({
  section,
  sectionIndex,
  primaryColor,
}: Props) {
  const hasImage = !!section.image_url;
  const bg = sectionIndex % 2 === 0 ? "bg-background" : "bg-muted/30";
  const imageLeft = sectionIndex % 2 === 0;

  const button = section.button;

  return (
    <section className={`py-16 md:py-24 px-4 md:px-8 ${bg}`}>
      {hasImage ? (
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div
            className={`md:w-1/2 w-full order-1 ${
              imageLeft ? "md:order-1" : "md:order-2"
            }`}
          >
            <img
              src={section.image_url}
              alt={section.title || "Section image"}
              className="rounded-2xl h-80 object-cover w-full"
            />
          </div>
          <div
            className={`flex-1 order-2 ${
              imageLeft ? "md:order-2" : "md:order-1"
            }`}
          >
            {section.title && (
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
                {section.title}
              </h2>
            )}
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
            {button && (
              <Link
                href={button.link || "#"}
                target={button.new_tab ? "_blank" : undefined}
                rel={button.new_tab ? "noopener noreferrer" : undefined}
                className="inline-flex items-center rounded-full px-6 py-3 text-sm font-medium text-white mt-6 transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {button.text}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto text-center">
          {section.title && (
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              {section.title}
            </h2>
          )}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {section.content}
          </p>
          {button && (
            <Link
              href={button.link || "#"}
              target={button.new_tab ? "_blank" : undefined}
              rel={button.new_tab ? "noopener noreferrer" : undefined}
              className="inline-flex items-center rounded-full px-6 py-3 text-sm font-medium text-white mt-6 transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {button.text}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
