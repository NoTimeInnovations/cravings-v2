import { ButtonV2 } from "@/components/ui/ButtonV2";

export default function Hero() {
  return (
    <section className="flex items-center justify-center px-5 pb-20 pt-32 md:pt-40 bg-[#fcfbf7]">
      <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Heading */}
        <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-gray-900 tracking-tight">
          Your restaurant&apos;s own delivery app
        </h1>

        {/* Subtitle */}
        <p className="geist-font text-lg text-[#544b47] max-w-md mt-5 leading-relaxed text-pretty">
          Stop paying 30% to aggregators. Your own ordering website with Petpooja POS, delivery app &amp; branded restaurant app.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 mt-8">
          <ButtonV2 href="https://cal.id/menuthere" variant="primary">
            Book a Demo
          </ButtonV2>
          <ButtonV2 href="/help-center" variant="secondary">
            Contact Support
          </ButtonV2>
        </div>
      </div>
    </section>
  );
}
