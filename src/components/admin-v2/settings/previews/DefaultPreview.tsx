import { Search, UtensilsCrossed } from "lucide-react";
import { PreviewProps, STORE_NAME, SAMPLE_ITEMS, SAMPLE_CATEGORIES, MUST_TRY_ITEMS, blendColor } from "./sampleData";

function ImagePlaceholder({ styles, size = "md" }: { styles: PreviewProps["styles"]; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "w-16 h-16" : "w-20 h-20";
  const solidBg = blendColor(styles.accent, styles.backgroundColor, 0.12);
  return (
    <div
      className={`${dims} rounded-2xl flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: solidBg }}
    >
      <UtensilsCrossed size={size === "sm" ? 14 : 18} style={{ color: styles.accent }} />
    </div>
  );
}

export function DefaultPreview({ styles, fontFamily, showGrid }: PreviewProps) {
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
      {/* Banner + Store Info */}
      <div className="px-[8%] pt-5 flex flex-col gap-3">
        {/* Banner circle */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            border: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
            backgroundColor: `${styles.accent}10`,
          }}
        >
          <UtensilsCrossed size={28} style={{ color: styles.accent }} />
        </div>

        <h1 className="font-black text-2xl">{STORE_NAME}</h1>
        <p className="text-xs" style={{ opacity: 0.6 }}>
          Delicious food, delivered fresh to your table
        </p>
      </div>

      {/* Search bar */}
      <div className="px-[8%] mt-4">
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2.5"
          style={{
            border: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
          }}
        >
          <Search size={14} style={{ opacity: 0.4 }} />
          <span className="text-xs" style={{ opacity: 0.4 }}>Search menu...</span>
        </div>
      </div>

      {/* Must Try */}
      <div className="mt-5 px-[8%]">
        <h2 className="text-lg font-black text-center mb-3">
          <span style={{ textDecorationColor: styles.accent, textDecorationLine: "underline", textUnderlineOffset: "4px", textDecorationThickness: "2px" }}>
            Must Try
          </span>
        </h2>
        <div className="flex gap-3 overflow-hidden">
          {MUST_TRY_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-[70%] rounded-[25px] p-3 flex items-center gap-3"
              style={{
                border: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{item.name}</p>
                <p className="text-[10px] mt-0.5" style={{ opacity: 0.5 }}>Classic favorite</p>
                <p className="text-xs font-bold mt-1" style={{ color: styles.accent }}>
                  &#8377;{item.price}
                </p>
              </div>
              <ImagePlaceholder styles={styles} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Categories + Items */}
      {[
        { cat: SAMPLE_CATEGORIES[1], items: starterItems },
        { cat: SAMPLE_CATEGORIES[2], items: mainItems },
      ].map(({ cat, items }) => (
        <div key={cat.id} className="mt-5 px-[8%]">
          <h2 className="text-base font-bold mb-3" style={{ color: styles.accent }}>
            {cat.name}
          </h2>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[25px] p-3 flex items-center gap-3"
                style={{
                  border: `${styles.border.borderWidth} ${styles.border.borderStyle} ${styles.border.borderColor}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">{item.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ opacity: 0.5 }}>
                    A delicious dish
                  </p>
                  <p className="text-xs font-bold mt-1" style={{ color: styles.accent }}>
                    &#8377;{item.price}
                  </p>
                </div>
                {item.hasImage && <ImagePlaceholder styles={styles} size="sm" />}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="h-10" />
    </div>
  );
}
