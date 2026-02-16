import { ButtonV2 } from "@/components/ui/ButtonV2";
import MenuUpload from "./MenuUpload";

export default function Hero() {
  return (
    <section className="flex items-center justify-center px-5 pb-20 pt-32 md:pt-40 bg-[#fcfbf7]">
      <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Heading */}
        <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-gray-900 tracking-tight">
          Create your restaurant&apos;s digital menu in minutes
        </h1>

        {/* Subtitle */}
        <p className="geist-font text-lg text-[#544b47] max-w-md mt-5 leading-relaxed text-pretty">
          QR code menus with real-time updates, Google Business sync &amp; analytics. No app needed.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 mt-8">
          <ButtonV2 href="/get-started" variant="primary">
            Start for free
          </ButtonV2>
          <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
            Book a Demo
          </ButtonV2>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm mt-10">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* Upload Menu Section (client component) */}
        <MenuUpload />
      </div>
    </section>
  );
}
