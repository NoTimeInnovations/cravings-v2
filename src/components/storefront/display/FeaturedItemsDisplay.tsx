import Link from "next/link";
import { FeaturedItemsSection } from "@/types/storefront";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

interface Props {
  section: FeaturedItemsSection;
  menuItems: MenuItem[];
  primaryColor: string;
  menuUrl: string;
}

export function FeaturedItemsDisplay({
  section,
  menuItems,
  primaryColor,
  menuUrl,
}: Props) {
  const selected = section.item_ids
    .map((id) => menuItems.find((m) => m.id === id))
    .filter((x): x is MenuItem => Boolean(x));

  if (selected.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 text-gray-900">
          {section.title}
        </h2>
        <p className="text-center text-muted-foreground mb-10">
          Customers can&apos;t stop talking about these
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {selected.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-white overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="aspect-square object-cover w-full"
                />
              ) : (
                <div
                  className="aspect-square w-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="p-3 md:p-4">
                <h3 className="font-semibold text-base line-clamp-2">
                  {item.name}
                </h3>
                <p
                  className="font-medium mt-1"
                  style={{ color: primaryColor }}
                >
                  ₹{item.price}
                </p>
                <Link
                  href={menuUrl}
                  className="inline-block mt-3 text-sm font-medium"
                  style={{ color: primaryColor }}
                >
                  Order →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
