import Link from "next/link";
import { getT } from "@/lib/i18n/server";

type Theme = "orange" | "whatsapp";

/**
 * The "Launch in 2 minutes" CTA banner used across the landing page and every
 * marketing / solutions page. It renders directly above the (orange) Footer, so
 * a solid orange or green block here merges with the footer into one slab. It is
 * therefore a light cream panel (matching the landing hero) with a soft accent
 * glow; `theme` only tints that glow + the primary button, so the WhatsApp page
 * keeps its green identity while the whole section stays light and airy.
 */
const THEMES: Record<Theme, { glow: string; button: string }> = {
  orange: {
    glow: "radial-gradient(110% 120% at 92% 0%, rgba(232,93,4,0.14) 0%, rgba(255,138,66,0.06) 38%, transparent 70%)",
    button:
      "bg-[#E85D04] hover:bg-[#d15503] shadow-[0_12px_30px_-12px_rgba(232,93,4,0.55)]",
  },
  whatsapp: {
    glow: "radial-gradient(110% 120% at 92% 0%, rgba(37,211,102,0.16) 0%, rgba(37,211,102,0.06) 38%, transparent 70%)",
    button:
      "bg-[#25D366] hover:bg-[#1fbe5a] shadow-[0_12px_30px_-12px_rgba(37,211,102,0.5)]",
  },
};

export default async function StartFreeTrailSection({
  heading,
  description,
  theme = "orange",
}: {
  heading?: string;
  description?: string;
  theme?: Theme;
} = {}) {
  // Defaults moved off the parameter list: a default value is evaluated at
  // module scope and cannot await the request locale.
  const { t: copy } = await getT();
  const resolvedHeading = heading ?? copy.landing.ctaBannerHeadingDefault;
  const resolvedDescription = description ?? copy.landing.ctaBannerBodyDefault;
  const th = THEMES[theme];

  return (
    <section className="relative overflow-hidden bg-[#FAF7F0] border-t border-[rgba(11,11,12,0.08)]">
      {/* Soft accent glow — the only place the theme color shows through */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: th.glow }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-2xl">
          <h2 className="font-bricolage font-semibold tracking-tight text-[#0A0A0B] text-3xl md:text-[42px] leading-[1.1]">
            {resolvedHeading}
          </h2>
          <p className="mt-4 max-w-xl text-[15px] md:text-[17px] leading-relaxed text-[#4A4A50]">
            {resolvedDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/get-started"
              className={`inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 ${th.button}`}
            >
              {copy.landing.ctaBannerPrimaryButton}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full border border-[rgba(11,11,12,0.14)] bg-white px-6 py-3 text-sm font-semibold text-[#0A0A0B] transition-colors duration-200 hover:border-[rgba(11,11,12,0.28)] hover:bg-[rgba(11,11,12,0.02)]"
            >
              {copy.landing.ctaBannerSecondaryButton}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
