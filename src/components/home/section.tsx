import { cn } from "@/lib/utils";

/**
 * Landing-page design system
 * ──────────────────────────
 * Single source of truth for how every home-page section is laid out, derived
 * from the hero so the whole page shares one width, horizontal gutter and
 * vertical rhythm. Import these constants (or the <Section> wrapper) instead of
 * hand-writing max-width / padding on each section.
 */

/** Centered content column — identical width + gutter to the hero. */
export const SECTION_CONTAINER =
  "mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12";

/** Same column width + gutter, minus the centering (for nested use). */
export const SECTION_GUTTER = "px-6 md:px-10 lg:px-12";

/** Vertical rhythm applied to every section. */
export const SECTION_SPACING = "py-16 md:py-24";

/** Framed left/right border used by the "editorial" sections. */
export const SECTION_BORDER = "border-l border-r border-stone-200";

export function Section({
  children,
  className,
  containerClassName,
  spacing = SECTION_SPACING,
  bordered = false,
  /** When false, the content column keeps its max-width but drops the gutter
   *  (for sections with full-bleed inner layouts that supply their own
   *  padding). */
  gutter = true,
  id,
}: {
  children: React.ReactNode;
  /** Section-level styles: background, top/bottom borders (full-bleed). */
  className?: string;
  /** Extra classes on the centered content container. */
  containerClassName?: string;
  /** Override the default vertical padding. */
  spacing?: string;
  /** Draw the framed left/right border down the content column. */
  bordered?: boolean;
  gutter?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative", className)}>
      <div
        className={cn(
          "mx-auto w-full max-w-7xl",
          gutter && SECTION_GUTTER,
          spacing,
          bordered && SECTION_BORDER,
          containerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
