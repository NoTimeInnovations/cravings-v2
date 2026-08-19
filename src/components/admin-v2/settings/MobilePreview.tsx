import { DefaultPreview } from "./previews/DefaultPreview";
import { CompactPreview } from "./previews/CompactPreview";
import { SidebarPreview } from "./previews/SidebarPreview";
import { V3Preview } from "./previews/V3Preview";
import { V4Preview } from "./previews/V4Preview";
import { V5Preview } from "./previews/V5Preview";
import { V6Preview } from "./previews/V6Preview";
import type { PreviewStyles } from "./previews/sampleData";

interface MobilePreviewProps {
  menuStyle: string;
  colors: {
    text: string;
    bg: string;
    accent: string;
  };
  fontFamily: string;
  showGrid: boolean;
  /**
   * "plain" is the original flat card admin-v2 shows. "device" wraps it in an
   * Android handset shell — bezel, rounded corners, punch-hole camera and a
   * gesture bar — which is what makes a menu preview read as a phone screen
   * rather than as another settings card.
   */
  frame?: "plain" | "device";
  /** The small "Preview" caption. Off when the surrounding card already says so. */
  showLabel?: boolean;
}

const FRAME_WIDTH = 272;
const VIEWPORT_WIDTH = 375;
const SCALE = FRAME_WIDTH / VIEWPORT_WIDTH;
const VIEWPORT_HEIGHT = 750;
const FRAME_HEIGHT = Math.round(VIEWPORT_HEIGHT * SCALE);

export function MobilePreview({
  menuStyle,
  colors,
  fontFamily,
  showGrid,
  frame = "plain",
  showLabel = true,
}: MobilePreviewProps) {
  const styles: PreviewStyles = {
    backgroundColor: colors.bg,
    color: colors.text,
    accent: colors.accent,
    showGrid,
    border: {
      borderColor: `${colors.text}1D`,
      borderWidth: "1px",
      borderStyle: "solid",
    },
  };

  const screen = (
    /* Inner viewport at mobile size, scaled down */
    <div
      className="overflow-y-auto overflow-x-hidden scrollbar-hide"
      style={{
        width: `${VIEWPORT_WIDTH}px`,
        height: `${VIEWPORT_HEIGHT}px`,
        transform: `scale(${SCALE})`,
        transformOrigin: "top left",
      }}
    >
          {menuStyle === "compact" && (
            <CompactPreview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
          {menuStyle === "sidebar" && (
            <SidebarPreview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
          {menuStyle === "v3" && (
            <V3Preview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
          {menuStyle === "v4" && (
            <V4Preview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
          {menuStyle === "v5" && (
            <V5Preview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
          {menuStyle === "v6" && (
            <V6Preview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
          {(menuStyle === "default" || (menuStyle !== "compact" && menuStyle !== "sidebar" && menuStyle !== "v3" && menuStyle !== "v4" && menuStyle !== "v5" && menuStyle !== "v6")) && (
            <DefaultPreview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
    </div>
  );

  if (frame === "device") {
    return (
      <div className="flex flex-col items-center gap-2.5">
        {showLabel ? (
          <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
            Preview
          </p>
        ) : null}
        {/* Bezel. The inner radius is deliberately smaller than the outer one —
            a device is a thick frame around a slightly rounder screen, and
            matching the two is what made the earlier attempt read as a card. */}
        <div
          className="rounded-[34px] bg-zinc-900 p-[9px] shadow-[0_18px_40px_-16px_rgba(9,9,11,0.45)] ring-1 ring-black/10 dark:bg-zinc-800 dark:ring-white/10"
          style={{ width: `${FRAME_WIDTH + 18}px` }}
        >
          <div
            className="relative overflow-hidden rounded-[26px] bg-white"
            style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` }}
          >
            {screen}
            {/* Punch-hole camera, and the Android gesture bar. Both sit ABOVE
                the scaled screen, so they never scroll with the menu. */}
            <span className="pointer-events-none absolute left-1/2 top-[7px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-zinc-900/85" />
            <span className="pointer-events-none absolute bottom-[5px] left-1/2 h-[3px] w-[86px] -translate-x-1/2 rounded-full bg-zinc-900/25" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {showLabel ? (
        <p className="text-sm font-medium text-muted-foreground">Preview</p>
      ) : null}
      <div
        className="rounded-[8px] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` }}
      >
        {screen}
      </div>
    </div>
  );
}
