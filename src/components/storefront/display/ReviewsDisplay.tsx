import { ReviewsSection } from "@/types/storefront";
import { Star } from "lucide-react";

interface Props {
  section: ReviewsSection;
  primaryColor: string;
}

export function ReviewsDisplay({ section, primaryColor }: Props) {
  if (section.reviews.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-4 md:px-8 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-gray-900">
          {section.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-lg bg-white p-6 border-l-4 shadow-sm"
              style={{ borderLeftColor: primaryColor }}
            >
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="h-4 w-4"
                    style={{
                      fill: n <= r.rating ? primaryColor : "transparent",
                      stroke: n <= r.rating ? primaryColor : "#d1d5db",
                    }}
                  />
                ))}
              </div>
              {r.text && (
                <p className="italic text-base leading-relaxed mb-4">
                  &ldquo;{r.text}&rdquo;
                </p>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gray-900">
                  {r.author || "Anonymous"}
                </span>
                {r.date && (
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
