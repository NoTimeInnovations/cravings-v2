import { UtensilsCrossed, Phone, MapPin, ShoppingBag, ChevronRight, Search, Store, ChevronDown, Star } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { PreviewProps, STORE_NAME, STORE_LOCATION, SAMPLE_ITEMS, SAMPLE_CATEGORIES } from "./sampleData";

function ImagePlaceholder() {
  return (
    <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
      <UtensilsCrossed size={14} className="text-gray-300" />
    </div>
  );
}

function VegMark({ veg }: { veg: boolean }) {
  return (
    <div className={`flex h-3 w-3 items-center justify-center rounded-sm border-[1.5px] ${veg ? "border-emerald-600" : "border-red-600"}`}>
      <div className={`h-1 w-1 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
    </div>
  );
}

export function V3Preview({ styles, fontFamily, showGrid }: PreviewProps) {
  const starterItems = SAMPLE_ITEMS.filter(i => i.category === "starters");
  const mainItems = SAMPLE_ITEMS.filter(i => i.category === "main");

  return (
    <div
      className="min-h-full"
      style={{
        backgroundColor: "#ffffff",
        color: "#111827",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Sticky Header - matches cravings-v3 */}
      <div className="sticky top-0 z-10 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
        <div className="flex h-10 items-center gap-2 px-3">
          {/* Left: location */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Store size={10} className="text-gray-900 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="text-[7px] font-semibold uppercase tracking-wide text-gray-400">Pickup from</p>
              <p className="truncate text-[9px] font-bold text-gray-900">{STORE_NAME}</p>
            </div>
            <ChevronDown size={8} className="text-gray-400 shrink-0" />
          </div>
          {/* Right: search + cart */}
          <div className="flex items-center gap-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100">
              <Search size={10} className="text-gray-900" />
            </div>
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100">
              <ShoppingBag size={10} className="text-gray-900" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-gray-900 px-0.5 text-[6px] font-bold text-white">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero - compact with logo */}
      <div className="px-3 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <span className="text-lg">🍽️</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>
              {STORE_NAME}
            </h1>
            <p className="truncate text-[8px] text-gray-400">{STORE_LOCATION}</p>
          </div>
        </div>

        {/* Contact row - all black icons */}
        <div className="mt-2 flex items-center gap-1.5">
          {[
            { icon: <Phone size={8} /> },
            { icon: <FaWhatsapp size={8} /> },
            { icon: <MapPin size={8} /> },
            { icon: <FaInstagram size={8} /> },
            { icon: <Star size={8} /> },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-900"
            >
              {item.icon}
            </div>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="sticky top-10 z-10 mt-2 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
        <div className="flex gap-1 overflow-x-auto px-3 py-1.5 scrollbar-hide">
          {SAMPLE_CATEGORIES.map((cat, i) => (
            <div
              key={cat.id}
              className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold ${
                i === 0
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <div className="px-3">
        {[
          { cat: SAMPLE_CATEGORIES[1], items: starterItems },
          { cat: SAMPLE_CATEGORIES[2], items: mainItems },
        ].map(({ cat, items }) => (
          <div key={cat.id} className="pt-3">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[10px] font-extrabold tracking-tight text-gray-900">{cat.name}</h2>
              <span className="text-[8px] text-gray-400">({items.length})</span>
            </div>

            <div className="divide-y divide-gray-200/60">
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <VegMark veg={idx % 2 === 0} />
                      {idx === 0 && (
                        <span className="text-[6px] font-bold uppercase tracking-wider text-amber-600">⭐ Bestseller</span>
                      )}
                    </div>
                    <h3 className="mt-0.5 text-[9px] font-bold leading-snug text-gray-900">{item.name}</h3>
                    <p className="mt-0.5 text-[8px] font-bold text-gray-900">₹{item.price}</p>
                    <p className="mt-0.5 text-[7px] text-gray-400 line-clamp-1">A delicious selection</p>
                  </div>
                  <div className="relative shrink-0">
                    <ImagePlaceholder />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <div className="rounded border border-emerald-600/30 bg-white px-2.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-sm">
                        Add
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating cart */}
      <div className="sticky bottom-0 px-2 pb-1.5">
        <div className="flex items-center justify-between rounded-lg bg-emerald-600 px-3 py-2 text-white shadow-lg shadow-emerald-600/25">
          <div className="flex items-center gap-1.5">
            <ShoppingBag size={10} />
            <span className="text-[8px] font-bold">2 items · ₹448</span>
          </div>
          <div className="flex items-center gap-0.5 text-[8px] font-bold">
            View Cart
            <ChevronRight size={8} />
          </div>
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}
