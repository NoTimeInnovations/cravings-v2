import { AboutSection } from "@/types/storefront";

interface Props {
  section: AboutSection;
}

export function AboutDisplay({ section }: Props) {
  const hasImage = !!section.image_url;

  return (
    <section className="py-16 md:py-24 px-4 md:px-8">
      {hasImage ? (
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="flex-1 order-2 md:order-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              {section.title}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {section.content}
            </p>
          </div>
          <div className="md:w-1/2 order-1 md:order-2 w-full">
            <img
              src={section.image_url}
              alt={section.title}
              className="rounded-2xl h-80 object-cover w-full"
            />
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            {section.title}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {section.content}
          </p>
        </div>
      )}
    </section>
  );
}
