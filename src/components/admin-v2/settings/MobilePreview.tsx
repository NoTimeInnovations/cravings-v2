import { DefaultPreview } from "./previews/DefaultPreview";
import { CompactPreview } from "./previews/CompactPreview";
import { SidebarPreview } from "./previews/SidebarPreview";
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
}

const FRAME_WIDTH = 272;
const VIEWPORT_WIDTH = 375;
const SCALE = FRAME_WIDTH / VIEWPORT_WIDTH;
const VIEWPORT_HEIGHT = 750;
const FRAME_HEIGHT = Math.round(VIEWPORT_HEIGHT * SCALE);

export function MobilePreview({ menuStyle, colors, fontFamily, showGrid }: MobilePreviewProps) {
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

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-muted-foreground">Preview</p>

      {/* Phone frame - outer container clips to scaled size */}
      <div
        className="rounded-[8px] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` }}
      >
        {/* Inner viewport at mobile size, scaled down */}
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
          {(menuStyle === "default" || (menuStyle !== "compact" && menuStyle !== "sidebar")) && (
            <DefaultPreview styles={styles} fontFamily={fontFamily} showGrid={showGrid} />
          )}
        </div>
      </div>
    </div>
  );
}
