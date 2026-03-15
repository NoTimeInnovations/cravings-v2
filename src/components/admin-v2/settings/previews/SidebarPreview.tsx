import { MapPin, Phone, Search, Star, LayoutGrid, UtensilsCrossed } from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { PreviewProps, STORE_NAME, STORE_LOCATION, SAMPLE_ITEMS, SAMPLE_CATEGORIES, blendColor } from "./sampleData";

function ItemCard({ name, price, styles }: { name: string; price: string; styles: PreviewProps["styles"] }) {
  const solidBg = blendColor(styles.accent, styles.backgroundColor, 0.12);
  return (
    <div
      className="flex flex-col relative z-10 rounded-xl p-0.5 overflow-hidden"
      style={{
        backgroundColor: blendColor(styles.color, styles.backgroundColor, 0.06),
        border: `1px solid ${styles.border.borderColor}`,
      }}
    >
      {/* Image placeholder */}
      <div
        className="aspect-square rounded-lg flex items-center justify-center"
        style={{ backgroundColor: solidBg }}
      >
        <UtensilsCrossed size={14} style={{ color: styles.accent }} />
      </div>
      <div className="px-0.5 py-0.5">
        <p className="text-[8px] font-medium truncate leading-tight">{name}</p>
        <p className="text-[8px] font-bold" style={{ color: styles.accent }}>&#8377;{price}</p>
      </div>
    </div>
  );
}

export function SidebarPreview({ styles, fontFamily, showGrid }: PreviewProps) {
  const activeCategory = "Starters";
  const displayItems = SAMPLE_ITEMS.filter(i => i.category === "starters");
  const sidebarCategories = [
    { id: "must-try", name: "Must Try", type: "icon" as const },
    ...SAMPLE_CATEGORIES.slice(1).map(c => ({ ...c, type: "letter" as const })),
    { id: "all", name: "All", type: "icon" as const },
  ];

  const gridStyle = showGrid
    ? {
        backgroundImage: `linear-gradient(${styles.color}08 1px, transparent 1px), linear-gradient(90deg, ${styles.color}08 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }
    : {};

  return (
    <div
      className="min-h-full flex flex-col"
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: fontFamily || "Poppins, sans-serif",
      }}
    >
      {/* Banner with gradient overlay */}
      <div className="relative">
        <div
          className="w-full h-[120px] relative overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: styles.accent }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#fff 2px, transparent 2px)",
              backgroundSize: "20px 20px",
            }}
          />
          <h1 className="text-white font-bold text-2xl z-10 drop-shadow-md text-center px-4">
            {STORE_NAME}
          </h1>
        </div>
        {/* Gradient overlay at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20"
          style={{ background: `linear-gradient(to top, ${styles.backgroundColor}, transparent)` }}
        />
      </div>

      {/* Store info + action icons */}
      <div
        className="flex items-start justify-between px-4 pb-2.5 -mt-3 relative z-10"
        style={{
          borderBottom: `1px solid ${styles.border.borderColor}`,
          backgroundColor: styles.backgroundColor,
        }}
      >
        <div className="flex flex-col gap-0.5">
          <h1 className="text-sm font-bold">{STORE_NAME}</h1>
          <div className="inline-flex items-center gap-1 text-[9px]" style={{ opacity: 0.6 }}>
            <MapPin size={9} />
            <span>{STORE_LOCATION}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {[Phone, FaWhatsapp, FaInstagram, Search].map((Icon, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${styles.color}10`, color: styles.color }}
            >
              <Icon size={11} />
            </div>
          ))}
        </div>
      </div>

      {/* Main content: sidebar + items — grid only here */}
      <div className="flex flex-1" style={gridStyle}>
        {/* Category sidebar */}
        <div
          className="w-[60px] flex-shrink-0 flex flex-col items-center py-2 gap-1"
          style={{ backgroundColor: styles.backgroundColor }}
        >
          {sidebarCategories.map((cat) => {
            const isActive = cat.name === activeCategory;
            return (
              <div key={cat.id} className="flex flex-col items-center gap-0.5 py-1.5 px-1 relative w-full">
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full"
                    style={{ backgroundColor: styles.accent }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: isActive ? styles.accent : `${styles.accent}10`,
                    color: isActive ? "white" : styles.accent,
                    boxShadow: isActive ? `0 2px 8px ${styles.accent}40` : "none",
                  }}
                >
                  {cat.type === "icon" && cat.id === "must-try" && <Star size={14} />}
                  {cat.type === "icon" && cat.id === "all" && <LayoutGrid size={14} />}
                  {cat.type === "letter" && cat.name.charAt(0)}
                </div>
                <span
                  className="text-[7px] text-center leading-tight"
                  style={{
                    color: isActive ? styles.accent : `${styles.color}99`,
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px self-stretch" style={{ backgroundColor: styles.border.borderColor }} />

        {/* Items area */}
        <div className="flex-1 min-w-0">
          <div className="px-2.5 pt-2.5 pb-1.5 flex items-baseline justify-between">
            <h2 className="text-xs font-bold">{activeCategory}</h2>
            <span className="text-[8px]" style={{ opacity: 0.4 }}>
              {displayItems.length} items
            </span>
          </div>

          {/* 3-column grid */}
          <div className="px-2 grid grid-cols-3 gap-1.5">
            {SAMPLE_ITEMS.slice(0, 9).map((item) => (
              <ItemCard
                key={item.id}
                name={item.name}
                price={item.price}
                styles={styles}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="h-10" />
    </div>
  );
}
