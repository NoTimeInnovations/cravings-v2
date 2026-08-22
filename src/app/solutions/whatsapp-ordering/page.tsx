import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonV2 } from "@/components/ui/ButtonV2";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import WhatsAppOrderDemo from "./_components/WhatsAppOrderDemo";
import {
  ArrowRight,
  MessageCircle,
  Zap,
  Smartphone,
  BadgeCheck,
  Globe,
  Bell,
  ShieldCheck,
  BarChart3,
  Inbox,
  Sparkles,
  Check,
  X,
  IndianRupee,
  Truck,
  MousePointerClick,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getT } from "@/lib/i18n/server";

const CANONICAL = "https://menuthere.com/solutions/whatsapp-ordering";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();

  return {
    title: t.solutionsRest.whatsappOrdering.metaTitle,
    description: t.solutionsRest.whatsappOrdering.metaDescription,
    keywords: t.solutionsRest.whatsappOrdering.metaKeywords,
    alternates: { canonical: CANONICAL },
    openGraph: {
      title: t.solutionsRest.whatsappOrdering.ogTitle,
      description: t.solutionsRest.whatsappOrdering.ogDescription,
      type: "website",
      url: CANONICAL,
    },
  };
}

/* --------------------------------- page ----------------------------------- */

export default async function WhatsAppOrderingPage() {
  const { t } = await getT();
  const c = t.solutionsRest.whatsappOrdering;
  const shared = t.solutionsRest.shared;

  /* ------------------------------ page data ------------------------------- */
  // Copy lives in the dictionary, so these lists are built inside the
  // component — a module-level const cannot read the request's locale.
  const STEPS = [
    {
      n: "01",
      icon: MessageCircle,
      title: c.step1Title,
      body: c.step1Body,
    },
    {
      n: "02",
      icon: Zap,
      title: c.step2Title,
      body: c.step2Body,
    },
    {
      n: "03",
      icon: MousePointerClick,
      title: c.step3Title,
      body: c.step3Body,
    },
    {
      n: "04",
      icon: Bell,
      title: c.step4Title,
      body: c.step4Body,
    },
  ];

  const FEATURES = [
    {
      icon: Smartphone,
      title: c.feature1Title,
      body: c.feature1Body,
    },
    {
      icon: BadgeCheck,
      title: c.feature2Title,
      body: c.feature2Body,
    },
    {
      icon: Globe,
      title: c.feature3Title,
      body: c.feature3Body,
    },
    {
      icon: Bell,
      title: c.feature4Title,
      body: c.feature4Body,
    },
    {
      icon: ShieldCheck,
      title: c.feature5Title,
      body: c.feature5Body,
    },
    {
      icon: Sparkles,
      title: c.feature6Title,
      body: c.feature6Body,
    },
    {
      icon: Inbox,
      title: c.feature7Title,
      body: c.feature7Body,
    },
    {
      icon: BarChart3,
      title: c.feature8Title,
      body: c.feature8Body,
    },
  ];

  const COMPARISON = [
    {
      label: c.comparisonRow1Label,
      us: { v: shared.zeroPercentValue, good: true },
      aggregator: { v: c.comparisonRow1Aggregator, good: false },
      chatbot: { v: c.comparisonRow1Chatbot, good: false },
    },
    {
      label: c.comparisonRow2Label,
      us: { v: c.comparisonRow2Us, good: true },
      aggregator: { v: c.comparisonValueYes, good: false },
      chatbot: { v: c.comparisonValueNo, good: true },
    },
    {
      label: c.comparisonRow3Label,
      us: { v: c.comparisonRow3Us, good: true },
      aggregator: { v: c.comparisonRow3Aggregator, good: false },
      chatbot: { v: c.comparisonRow3Chatbot, good: false },
    },
    {
      label: c.comparisonRow4Label,
      us: { v: c.comparisonRow4Us, good: true },
      aggregator: { v: c.comparisonRow4Aggregator, good: false },
      chatbot: { v: c.comparisonRow4Chatbot, good: false },
    },
    {
      label: c.comparisonRow5Label,
      us: { v: c.comparisonValueYes, good: true },
      aggregator: { v: c.comparisonValueNo, good: false },
      chatbot: { v: c.comparisonRow5Chatbot, good: true },
    },
    {
      label: c.comparisonRow6Label,
      us: { v: c.comparisonRow6Us, good: true },
      aggregator: { v: c.comparisonRow6Aggregator, good: false },
      chatbot: { v: c.comparisonRow6Chatbot, good: false },
    },
    {
      label: c.comparisonRow7Label,
      us: { v: c.comparisonRow7Us, good: true },
      aggregator: { v: c.comparisonValueNo, good: false },
      chatbot: { v: c.comparisonRow7Chatbot, good: false },
    },
    {
      label: c.comparisonRow8Label,
      us: { v: c.comparisonRow8Us, good: true },
      aggregator: { v: c.comparisonRow8Aggregator, good: false },
      chatbot: { v: c.comparisonRow8Chatbot, good: false },
    },
  ];

  const FAQ = [
    { q: c.faq1Question, a: c.faq1Answer },
    { q: c.faq2Question, a: c.faq2Answer },
    { q: c.faq3Question, a: c.faq3Answer },
    { q: c.faq4Question, a: c.faq4Answer },
    { q: c.faq5Question, a: c.faq5Answer },
    { q: c.faq6Question, a: c.faq6Answer },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const productLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: c.structuredDataProductName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, WhatsApp",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description: c.structuredDataProductDescription,
    url: CANONICAL,
  };

  return (
    <main className="min-h-screen w-full bg-white geist-font">
      <JsonLd data={faqLd} />
      <JsonLd data={productLd} />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section
        className="relative overflow-hidden bg-[#FAF7F0] pt-32 md:pt-40 pb-16 md:pb-24"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 100% 0%, rgba(37,211,102,0.10) 0%, rgba(37,211,102,0.04) 35%, transparent 70%)",
        }}
      >
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-12">
          {/* copy */}
          <div>
            <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white border border-[#25D366]/25 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#0f9d58] shadow-[0_2px_8px_-3px_rgba(37,211,102,0.25)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#25D366]" />
              </span>
              <span>{c.heroBadge}</span>
              <span className="ml-0.5 rounded bg-[#25D366] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                {c.heroBadgeNew}
              </span>
            </div>

            <h1
              className="mt-6 font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-[clamp(40px,5.2vw,64px)] leading-[1.05]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {c.heroTitle}
            </h1>

            <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-[#4A4A50]">
              {c.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonV2 href="/get-started" variant="primary">
                {c.primaryCta}
              </ButtonV2>
              <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
                {shared.bookDemoCta}
              </ButtonV2>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13.5px] font-medium text-[#3F3F44]">
              {[c.heroTrust1, c.heroTrust2, c.heroTrust3].map(
                (b) => (
                  <span key={b} className="inline-flex items-center gap-1.5">
                    <span className="inline-grid h-4 w-4 place-items-center rounded-full bg-[#25D366]/12 text-[#0f9d58]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                    {b}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* live demo */}
          <div className="flex justify-center lg:justify-end">
            <WhatsAppOrderDemo />
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────── How it works ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:px-12">
        <div className="max-w-2xl">
          <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1]">
            {c.stepsHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#76767B]">
            {c.stepsSubheading}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)] transition-colors hover:border-[#25D366]/30"
            >
              <span className="font-bricolage text-[13px] font-bold tracking-wider text-stone-300">
                {s.n}
              </span>
              <div className="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-[#25D366]/10 text-[#0f9d58]">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bricolage text-[17px] font-semibold tracking-tight text-[#0A0A0B]">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#76767B]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────── Features grid ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:px-12">
        <div className="max-w-2xl">
          <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1]">
            {c.featuresHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#76767B]">
            {c.featuresSubheading}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-6 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366]/10 text-[#0f9d58]">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bricolage text-[15px] font-semibold tracking-tight text-[#0A0A0B]">
                {f.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#76767B]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────── Friction comparison ─────────────────────── */}
      <section className="bg-[#FAF7F0]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:px-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1]">
                {c.frictionHeading}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#76767B]">
                {c.frictionSubheading}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-white p-5 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[#8E8E94]">
                  {c.frictionAggregatorLabel}
                </p>
                <ol className="mt-3 space-y-2 text-[13.5px] text-[#4A4A50]">
                  {[
                    c.frictionAggregatorStep1,
                    c.frictionAggregatorStep2,
                    c.frictionAggregatorStep3,
                    c.frictionAggregatorStep4,
                    c.frictionAggregatorStep5,
                  ].map((t, i) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-400">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl border-2 border-[#25D366]/40 bg-white p-5 shadow-[0_16px_36px_-18px_rgba(37,211,102,0.55)]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[#0f9d58]">
                  {c.frictionWhatsappLabel}
                </p>
                <ol className="mt-3 space-y-2 text-[13.5px] text-stone-700">
                  {[
                    c.frictionWhatsappStep1,
                    c.frictionWhatsappStep2,
                    c.frictionWhatsappStep3,
                  ].map((t, i) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#25D366]/15 text-[#0f9d58]">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 rounded-lg bg-[#25D366]/10 px-3 py-2 text-[12.5px] font-semibold text-[#0f9d58]">
                  {c.frictionHighlight}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────── Comparison table ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:px-12">
        <div className="max-w-2xl">
          <h2 className="font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1]">
            {c.comparisonHeading}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#76767B]">
            {c.comparisonSubheading}
          </p>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-[28%] px-4 py-4 text-[13px] font-medium text-stone-400">
                  &nbsp;
                </th>
                <th className="w-[24%] rounded-t-xl bg-[#0f9d58] px-4 py-4 text-[14px] font-semibold text-white">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    Menuthere
                  </span>
                </th>
                <th className="w-[24%] px-4 py-4 text-[14px] font-semibold text-stone-500">
                  {c.comparisonColAggregators}
                </th>
                <th className="w-[24%] px-4 py-4 text-[14px] font-semibold text-stone-500">
                  {c.comparisonColChatbots}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, idx) => (
                <tr
                  key={row.label}
                  className={idx % 2 ? "bg-stone-50/60" : "bg-white"}
                >
                  <td className="px-4 py-3.5 text-[13.5px] font-medium text-stone-700">
                    {row.label}
                  </td>
                  <Cell cell={row.us} highlight />
                  <Cell cell={row.aggregator} />
                  <Cell cell={row.chatbot} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────── Outcomes band ─────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:px-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              stat: c.outcome1Value,
              label: c.outcome1Label,
            },
            {
              icon: IndianRupee,
              stat: shared.zeroPercentValue,
              label: c.outcome2Label,
            },
            {
              icon: Truck,
              stat: c.outcome3Value,
              label: c.outcome3Label,
            },
          ].map((o) => (
            <div
              key={o.stat}
              className="rounded-2xl border border-[rgba(11,11,12,0.08)] bg-[#FAF7F0] p-7 shadow-[0_12px_32px_-16px_rgba(11,11,12,0.18)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#25D366]/10 text-[#0f9d58]">
                <o.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-bricolage text-3xl font-semibold tracking-tight text-[#0A0A0B]">
                {o.stat}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#76767B]">
                {o.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h2 className="text-center font-bricolage text-[#0A0A0B] tracking-tight font-semibold text-3xl md:text-[42px] leading-[1.1]">
          {c.faqHeading}
        </h2>
        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQ.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-[rgba(11,11,12,0.08)]"
            >
              <AccordionTrigger className="text-left text-[15px] font-semibold text-[#0A0A0B] hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-relaxed text-[#4A4A50]">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] text-[#76767B]">{c.faqCtaPrompt}</p>
          <div className="flex items-center gap-3">
            <ButtonV2 href="/get-started" variant="primary">
              {c.primaryCta}
            </ButtonV2>
            <Link
              href="/solutions/petpooja"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#4A4A50] transition-colors hover:text-[#0f9d58]"
            >
              {c.faqSecondaryLink}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <StartFreeTrailSection
        theme="whatsapp"
        heading={c.trialHeading}
        description={c.trialDescription}
      />
      <Footer appName="Menuthere" />
      <WhatsAppButton />
    </main>
  );
}

/* --------------------------------- bits ----------------------------------- */

function Cell({
  cell,
  highlight,
}: {
  cell: { v: string; good: boolean };
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3.5 text-[13.5px] ${
        highlight ? "bg-[#0f9d58]/5 font-semibold text-stone-900" : "text-stone-600"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {cell.good ? (
          <Check className="h-4 w-4 shrink-0 text-[#0f9d58]" strokeWidth={3} />
        ) : (
          <X className="h-4 w-4 shrink-0 text-stone-300" strokeWidth={3} />
        )}
        {cell.v}
      </span>
    </td>
  );
}
