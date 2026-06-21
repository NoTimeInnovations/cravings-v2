import { UtensilsCrossed, Phone, ShoppingBag, ChevronRight, Search, Clock, Sparkles } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import { PreviewProps, STORE_NAME, SAMPLE_ITEMS, SAMPLE_CATEGORIES } from "./sampleData";
import { readableTextColor } from "@/lib/brandColor";

function VegBadge({ veg }: { veg: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`flex h-2.5 w-2.5 items-center justify-center rounded-[2px] border-[1.5px] ${veg ? "border-emerald-600" : "border-red-600"}`}>
        <div className={`h-1 w-1 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
      </div>
      <span className={`text-[6px] font-bold uppercase tracking-wide ${veg ? "text-emerald-600" : "text-red-600"}`}>
        {veg ? "Veg" : "Non-Veg"}
      </span>
    </div>
  );
}

export function V4Preview({ styles }: PreviewProps) {
  const accent = styles.accent || "#E9701B";
  const onAccent = readableTextColor(accent);
  // Rail categories: Must Try + the sample categories (drop the dummy desserts
  // for a tidy preview).
  const railCats = SAMPLE_CATEGORIES.slice(0, 3);
  const sections = [
    { cat: SAMPLE_CATEGORIES[1], items: SAMPLE_ITEMS.filter((i) => i.category === "starters").slice(0, 3) },
    { cat: SAMPLE_CATEGORIES[2], items: SAMPLE_ITEMS.filter((i) => i.category === "main").slice(0, 2) },
  ];

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#ffffff", color: "#111827", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Hero banner */}
      <div className="relative h-[130px] w-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}, #111827)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 pb-5">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold leading-tight text-white" style={{ fontFamily: "'Georgia', serif" }}>
              {STORE_NAME}
            </h1>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 shadow-sm" style={{ backgroundColor: accent, color: onAccent }}>
              <Clock size={8} />
              <span className="text-[7px] font-bold">7:00 AM - 11:00 PM</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {[<Phone key="p" size={9} />, <FaInstagram key="i" size={9} />].map((ic, i) => (
              <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white">{ic}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky search + veg filter — rises over the banner as a rounded sheet */}
      <div className="sticky top-0 z-10 -mt-3 rounded-t-2xl border-b border-gray-200/70 bg-white shadow-[0_-6px_16px_rgba(0,0,0,0.07)]">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <div className="flex h-7 flex-1 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 text-gray-400">
            <Search size={10} />
            <span className="text-[8px]">Search items...</span>
          </div>
          <div className="flex h-7 items-center gap-1 rounded-full border border-gray-200 bg-white px-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            <span className="text-[8px] font-bold text-gray-700">ALL</span>
          </div>
        </div>
      </div>

      {/* Body: left rail + right list */}
      <div className="flex items-start">
        <div className="w-[58px] shrink-0 border-r border-gray-200/70 bg-white">
          <div className="flex flex-col py-1">
            {railCats.map((cat, i) => {
              const active = i === 0;
              return (
                <div key={cat.id} className="relative flex flex-col items-center gap-1 px-1 py-2 text-center">
                  {active && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full" style={{ backgroundColor: accent }} />}
                  <div
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl"
                    style={active ? { boxShadow: `0 0 0 1.5px ${accent}`, backgroundColor: `${accent}1A`, color: accent } : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}
                  >
                    {i === 0 ? <Sparkles size={12} /> : <UtensilsCrossed size={12} />}
                  </div>
                  <span className="line-clamp-2 text-[6px] font-bold leading-tight" style={{ color: active ? accent : "#6b7280" }}>
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1 px-3">
          {sections.map(({ cat, items }) => (
            <div key={cat.id} className="pt-2.5">
              <div className="flex items-center justify-between border-b border-gray-200/70 pb-1.5">
                <h2 className="text-[10px] font-extrabold tracking-tight text-gray-900">{cat.name}</h2>
                <span className="text-[7px] font-bold uppercase tracking-wider text-gray-400">{items.length} Items</span>
              </div>
              <div className="divide-y divide-gray-200/60">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <VegBadge veg={idx % 2 === 0} />
                      <h3 className="mt-0.5 text-[9px] font-bold leading-snug text-gray-900">{item.name}</h3>
                      <p className="mt-0.5 text-[8px] font-bold text-gray-900">₹{item.price}</p>
                      <p className="mt-0.5 text-[7px] text-gray-400 line-clamp-1">A delicious selection</p>
                    </div>
                    <div className="relative shrink-0">
                      <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-gray-100">
                        <UtensilsCrossed size={12} className="text-gray-300" />
                      </div>
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded border border-emerald-600/30 bg-white px-2 py-0.5 text-[6px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-sm">
                        Add
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
