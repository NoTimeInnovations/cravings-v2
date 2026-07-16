import { Search, ShoppingBag, MapPin, Plus, Home as HomeIcon, LayoutGrid, ClipboardList, User } from "lucide-react";
import { PreviewProps, STORE_NAME, STORE_LOCATION, SAMPLE_ITEMS, SAMPLE_CATEGORIES } from "./sampleData";

// Soft accent gradient for preview category tiles (mirrors v6utils, simplified).
function tileGradient(accent: string): string {
  return `linear-gradient(140deg, ${accent}33 0%, ${accent}14 55%, #ffffff 100%)`;
}

function VegMark({ veg }: { veg: boolean }) {
  const color = veg ? "#16a34a" : "#dc2626";
  return (
    <span className="flex h-[9px] w-[9px] items-center justify-center rounded-[2px] border-[1.5px]" style={{ borderColor: color }}>
      {veg ? (
        <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span style={{ width: 0, height: 0, borderLeft: "2px solid transparent", borderRight: "2px solid transparent", borderBottom: `3.5px solid ${color}` }} />
      )}
    </span>
  );
}

export function V6Preview({ styles }: PreviewProps) {
  const accent = styles.accent || "#16a34a";
  const gridItems = SAMPLE_ITEMS.slice(0, 4);

  return (
    <div className="min-h-full pb-14" style={{ backgroundColor: "#f7f7f5", color: "#111827", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar: address + cart badge */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}22`, color: accent }}>
            <MapPin size={11} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-extrabold leading-tight text-gray-900">{STORE_NAME}</p>
            <p className="truncate text-[8px] font-medium text-gray-400">{STORE_LOCATION}</p>
          </div>
        </div>
        <div className="flex h-7 items-center gap-1 rounded-full px-2.5" style={{ backgroundColor: `${accent}1f`, color: accent }}>
          <ShoppingBag size={11} />
          <span className="text-[10px] font-extrabold">02</span>
        </div>
      </div>

      {/* Search pill */}
      <div className="px-3 pb-2.5">
        <div className="flex h-8 items-center gap-1.5 rounded-2xl bg-gray-100 px-2.5 text-gray-400">
          <Search size={11} />
          <span className="text-[9px] font-medium">Search for dishes…</span>
        </div>
      </div>

      {/* Category rail */}
      <div className="flex items-center justify-between px-3 pb-1.5">
        <span className="text-[12px] font-extrabold tracking-tight text-gray-900">Categories</span>
        <span className="text-[9px] font-bold" style={{ color: accent }}>View All</span>
      </div>
      <div className="flex gap-2 overflow-hidden px-3 pb-1">
        {SAMPLE_CATEGORIES.slice(0, 4).map((c) => (
          <div key={c.id} className="flex w-[46px] shrink-0 flex-col items-center gap-1">
            <div className="h-[46px] w-[46px] rounded-2xl ring-1 ring-black/5" style={{ background: tileGradient(accent) }} />
            <span className="w-full truncate text-center text-[8px] font-semibold text-gray-600">{c.name}</span>
          </div>
        ))}
      </div>

      {/* Section strip */}
      <div className="flex items-center gap-3 px-3 pb-1.5 pt-2.5">
        <span className="text-[15px] font-extrabold tracking-tight text-gray-900">Popular</span>
        <span className="text-[11px] font-bold text-gray-300">All Items</span>
        <span className="text-[11px] font-bold text-gray-300">Offers</span>
      </div>

      {/* 2-col product grid */}
      <div className="grid grid-cols-2 gap-2 px-3">
        {gridItems.map((item, i) => (
          <div key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-sm">
            <div className="relative aspect-square w-full" style={{ backgroundColor: "#f3f4f6" }}>
              <div className="absolute left-1.5 top-1.5 rounded-[4px] bg-white/95 p-[2px] shadow-sm">
                <VegMark veg={i % 2 === 0} />
              </div>
            </div>
            <div className="px-2 pb-2 pt-1.5">
              <p className="line-clamp-1 text-[9px] font-bold leading-tight text-gray-900">{item.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-gray-900">₹{item.price}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full shadow" style={{ backgroundColor: accent, color: "#fff" }}>
                  <Plus size={11} strokeWidth={2.6} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating bottom nav */}
      <div className="sticky bottom-2 mx-auto mt-3 flex w-max items-center gap-1 rounded-full bg-white px-1.5 py-1.5 shadow-lg ring-1 ring-black/[0.06]">
        <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-bold" style={{ backgroundColor: accent, color: "#fff" }}>
          <HomeIcon size={11} /> Home
        </span>
        <span className="flex h-6 w-6 items-center justify-center text-gray-400"><LayoutGrid size={12} /></span>
        <span className="flex h-6 w-6 items-center justify-center text-gray-400"><ClipboardList size={12} /></span>
        <span className="flex h-6 w-6 items-center justify-center text-gray-400"><User size={12} /></span>
      </div>
    </div>
  );
}
