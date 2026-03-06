import { MapPin, Search, UtensilsCrossed, Phone, Instagram, Navigation } from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { PreviewProps, STORE_NAME, STORE_LOCATION, SAMPLE_ITEMS, SAMPLE_CATEGORIES, blendColor } from "./sampleData";

function ImagePlaceholder({ styles }: { styles: PreviewProps["styles"] }) {
  const solidBg = blendColor(styles.accent, styles.backgroundColor, 0.12);
  return (
    <div
      className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: solidBg }}
    >
      <UtensilsCrossed size={14} style={{ color: styles.accent }} />
    </div>
  );
}

export function CompactPreview({ styles, fontFamily, showGrid }: PreviewProps) {
  const starterItems = SAMPLE_ITEMS.filter(i => i.category === "starters");
  const mainItems = SAMPLE_ITEMS.filter(i => i.category === "main");

  return (
    <div
      className="min-h-full"
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: fontFamily || "Poppins, sans-serif",
      }}
    >
      {/* Banner */}
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
      </div>

      {/* Store details */}
      <div className="flex flex-col gap-1.5 p-4 pb-2">
        <h1 className="text-base font-semibold">{STORE_NAME}</h1>
        <div className="inline-flex gap-1.5 text-[10px]" style={{ opacity: 0.8 }}>
          <MapPin size={12} />
          <span>{STORE_LOCATION}</span>
        </div>
      </div>

      {/* Social links bar */}
      <div
        className="flex gap-2 px-4 pb-3 border-b"
        style={{ borderColor: styles.border.borderColor }}
      >
        {[
          { icon: <FaInstagram size={12} />, label: "Instagram" },
          { icon: <FaWhatsapp size={12} />, label: "WhatsApp" },
          { icon: <Navigation size={12} />, label: "Directions" },
        ].map((social) => (
          <div
            key={social.label}
            className="flex items-center gap-1.5 border rounded-md px-2 py-1.5"
            style={{ borderColor: `${styles.color}20` }}
          >
            <span style={{ opacity: 0.6 }}>{social.icon}</span>
            <span className="text-[9px]" style={{ opacity: 0.6 }}>{social.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="p-4">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            border: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
          }}
        >
          <Search size={13} style={{ opacity: 0.4 }} />
          <span className="text-[10px]" style={{ opacity: 0.4 }}>Search items...</span>
        </div>
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1 px-2 py-2 border-b relative"
        style={{
          borderColor: styles.border.borderColor,
          backgroundColor: styles.backgroundColor,
        }}
      >
        {SAMPLE_CATEGORIES.map((cat, i) => (
          <div
            key={cat.id}
            className="px-3 py-2 text-[10px] whitespace-nowrap"
            style={{
              color: i === 0 ? styles.accent : styles.color,
              fontWeight: i === 0 ? 600 : 500,
              borderBottom: i === 0 ? `2px solid ${styles.accent}` : "2px solid transparent",
            }}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* Category content */}
      {[
        { cat: SAMPLE_CATEGORIES[1], items: starterItems },
        { cat: SAMPLE_CATEGORIES[2], items: mainItems },
      ].map(({ cat, items }) => (
        <div key={cat.id} className="p-4">
          <h2 className="text-sm font-bold mb-3" style={{ color: styles.accent }}>
            {cat.name}
          </h2>
          <div className="divide-y" style={{ borderColor: styles.border.borderColor }}>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{item.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ opacity: 0.5 }}>
                    A tasty selection
                  </p>
                  <p className="text-xs font-bold mt-1" style={{ color: styles.accent }}>
                    &#8377;{item.price}
                  </p>
                </div>
                {item.hasImage && <ImagePlaceholder styles={styles} />}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="h-10" />
    </div>
  );
}
