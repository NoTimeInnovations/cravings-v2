import Link from "next/link";
import { getT } from "@/lib/i18n/server";

type Theme = "orange" | "whatsapp";

const THEMES: Record<
  Theme,
  { section: string; border: string; divider: string; dots: string }
> = {
  orange: {
    section: "bg-orange-600",
    border: "border-orange-400/20",
    divider: "bg-orange-400/20",
    dots: "bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1.5px,transparent_1.5px)]",
  },
  whatsapp: {
    section: "bg-[#0f9d58]",
    border: "border-white/15",
    divider: "bg-white/15",
    dots: "bg-[radial-gradient(circle,rgba(255,255,255,0.20)_1.5px,transparent_1.5px)]",
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
  const t = THEMES[theme];

  return (
    <section
      className={`relative overflow-hidden ${t.section} py-16 md:py-24 border-t border-b border-stone-200`}
    >
      <div className={`${t.divider} w-full h-px`} />

      <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-12 grid md:grid-cols-2">
        <div className="max-w-xl py-6 md:py-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            {resolvedHeading}
          </h2>
          <p className="text-white/70 mb-6">{resolvedDescription}</p>
          <div className="flex gap-3">
            <Link
              href="/get-started"
              className="inline-flex items-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-stone-800"
            >
              {copy.landing.ctaBannerPrimaryButton}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-white border border-white/40 transition-colors duration-200 hover:bg-white/10"
            >
              {copy.landing.ctaBannerSecondaryButton}
            </Link>
          </div>
        </div>

        <div
          className={`hidden md:block h-full w-full border-l ${t.border} relative`}
        >
          <div
            className={`relative h-full py-12 ${t.dots} bg-[size:20px_20px]`}
          ></div>
        </div>
      </div>

      <div className={`${t.divider} w-full h-px`} />
    </section>
  );
}
