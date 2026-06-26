import { Search, ChevronUp, ChevronDown, ShoppingBag, ChevronRight, ArrowLeft, MapPin, BadgePercent, Info } from "lucide-react";
import { PreviewProps, STORE_NAME, STORE_LOCATION, SAMPLE_ITEMS, SAMPLE_CATEGORIES } from "./sampleData";

// Zomato-style veg / non-veg mark.
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

export function V5Preview({ styles }: PreviewProps) {
  const accent = styles.accent || "#E9701B";
  // First section "Recommended" is expanded; the rest collapse into accordions.
  const recommended = SAMPLE_ITEMS.slice(0, 2);
  const collapsed = [SAMPLE_CATEGORIES[1], SAMPLE_CATEGORIES[2], SAMPLE_CATEGORIES[3]];

  return (
    <div className="min-h-full" style={{ backgroundColor: "#ffffff", color: "#111827", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <ArrowLeft size={11} />
        </div>
        <div className="flex h-6 flex-1 items-center gap-1.5 rounded-full bg-gray-100 px-2 text-gray-400">
          <Search size={10} />
          <span className="text-[8px]">Search</span>
        </div>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <ShoppingBag size={11} />
        </div>
      </div>

      {/* Identity: name + info, then location */}
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-1">
          <h1 className="text-[14px] font-extrabold leading-none tracking-tight text-gray-900">{STORE_NAME}</h1>
          <Info size={9} className="text-gray-400" />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[8px] font-medium text-gray-600">
          <MapPin size={9} className="text-gray-500" />
          <span>{STORE_LOCATION}</span>
        </div>
      </div>

      {/* Offer summary */}
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <BadgePercent size={12} style={{ color: "#059669" }} />
          <span className="text-[9px] font-bold text-gray-900">Items up to 50% off</span>
        </div>
        <div className="flex items-center gap-0.5 text-gray-400">
          <span className="text-[8px] font-medium">3 offers</span>
          <ChevronDown size={9} />
        </div>
      </div>

      {/* Filter chips */}
      <div className="h-1.5 bg-gray-100" />
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-1.5">
        <div className="flex h-5 items-center gap-1 rounded-full border border-gray-200 px-2">
          <VegMark veg />
          <span className="text-[7px] font-semibold text-gray-600">Veg</span>
        </div>
        <div className="flex h-5 items-center gap-1 rounded-full border border-gray-200 px-2">
          <VegMark veg={false} />
          <span className="text-[7px] font-semibold text-gray-600">Non-veg</span>
        </div>
      </div>

      {/* Recommended (expanded) */}
      <div className="px-3">
        <div className="flex items-center justify-between border-b-[3px] border-gray-100 py-2.5">
          <h2 className="text-[11px] font-extrabold tracking-tight text-gray-900">
            Recommended <span className="text-gray-400">({recommended.length})</span>
          </h2>
          <ChevronUp size={12} className="text-gray-500" />
        </div>
        <div className="divide-y divide-gray-100">
          {recommended.map((item, idx) => (
            <div key={item.id} className="flex gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <VegMark veg={idx % 2 === 0} />
                <h3 className="mt-0.5 text-[9px] font-bold leading-snug text-gray-900">{item.name}</h3>
                <p className="mt-0.5 text-[8px] font-bold text-gray-900">₹{item.price}</p>
              </div>
              <div className="relative shrink-0">
                <div className="h-[62px] w-[66px] overflow-hidden rounded-lg bg-gray-100" />
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-3 py-0.5 text-center text-[7px] font-extrabold uppercase tracking-wide shadow"
                  style={{ color: accent }}
                >
                  Add +
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsed accordion categories */}
      {collapsed.map((cat) => (
        <div key={cat.id} className="px-3">
          <div className="flex items-center justify-between border-b-[3px] border-gray-100 py-2.5">
            <h2 className="text-[11px] font-extrabold tracking-tight text-gray-900">{cat.name}</h2>
            <ChevronDown size={12} className="text-gray-500" />
          </div>
        </div>
      ))}

      {/* Floating cart */}
      <div className="sticky bottom-0 px-2 pb-1.5 pt-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-white shadow-lg" style={{ backgroundColor: accent }}>
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
