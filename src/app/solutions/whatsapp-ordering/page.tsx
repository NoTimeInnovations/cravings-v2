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

const CANONICAL = "https://menuthere.com/solutions/whatsapp-ordering";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      "WhatsApp Ordering for Restaurants — Customers Just Send 'Hi' | Menuthere",
    description:
      "Turn your WhatsApp number into an ordering channel. Customers send 'Hi', get an instant auto-login link, order from your visual menu, and receive live status updates — no app download, no signup, zero commission.",
    keywords:
      "whatsapp ordering, whatsapp ordering system for restaurants, order on whatsapp, whatsapp business ordering, restaurant whatsapp menu, send hi to order, whatsapp food ordering, conversational ordering, zero commission ordering",
    alternates: { canonical: CANONICAL },
    openGraph: {
      title: "WhatsApp Ordering — Customers Just Send 'Hi' | Menuthere",
      description:
        "The lowest-friction ordering channel for restaurants. Send 'Hi' → instant link → order on your menu → live WhatsApp updates. No app, no signup, zero commission.",
      type: "website",
      url: CANONICAL,
    },
  };
}

/* ------------------------------- page data -------------------------------- */

const STEPS = [
  {
    n: "01",
    icon: MessageCircle,
    title: "Customer sends “Hi”",
    body: "From a sticker, a table QR, your bio link or Google profile, the customer taps to WhatsApp and sends Hi to your number. No app to download, no form to fill.",
  },
  {
    n: "02",
    icon: Zap,
    title: "They get an instant Order Now link",
    body: "Your number replies in a second with a tappable Order Now button. The link signs them in automatically — no OTP, no password, no account creation.",
  },
  {
    n: "03",
    icon: MousePointerClick,
    title: "They order on your visual menu",
    body: "The link opens your branded web menu — already logged in. They browse photos, add to cart, pick UPI or cash, and place the order in a few taps.",
  },
  {
    n: "04",
    icon: Bell,
    title: "Updates flow back on WhatsApp",
    body: "Order received, accepted, food ready, out for delivery with a live tracking link, delivered — plus loyalty points. Every update lands right in the chat.",
  },
];

const FEATURES = [
  {
    icon: Smartphone,
    title: "No app, no signup",
    body: "Works on any phone that has WhatsApp. Sending “Hi” silently creates and recognises the customer, so they never hit a login wall.",
  },
  {
    icon: BadgeCheck,
    title: "Your own branded number",
    body: "Connect your real WhatsApp Business number in minutes via Meta — even the one you already use. Or go live instantly on our shared number.",
  },
  {
    icon: Globe,
    title: "Custom-domain order links",
    body: "Order links can run on your own domain (yourbrand.com), not a generic third-party URL — so every touchpoint stays on your brand.",
  },
  {
    icon: Bell,
    title: "Automated status updates",
    body: "Placed with full bill, accepted, ready, dispatched with a live tracking map link, completed and loyalty points — all sent automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Secure single-use links",
    body: "Every link is signed, expires in minutes and locks to the first opener — a forwarded link can never hijack someone’s logged-in session.",
  },
  {
    icon: Sparkles,
    title: "No-code message flows",
    body: "Your welcome and order messages are editable flows with keyword triggers, buttons and media — change the copy without touching code.",
  },
  {
    icon: Inbox,
    title: "Unified WhatsApp inbox",
    body: "Every inbound and outbound message is saved and viewable in your dashboard, so nothing slips through during a rush.",
  },
  {
    icon: BarChart3,
    title: "Channel-tagged analytics",
    body: "Orders placed over WhatsApp are tagged automatically. See App vs Website vs WhatsApp order counts and revenue side by side.",
  },
];

const COMPARISON = [
  {
    label: "Commission per order",
    us: { v: "0%", good: true },
    aggregator: { v: "20–33%", good: false },
    chatbot: { v: "Monthly fee + per-msg", good: false },
  },
  {
    label: "App download required",
    us: { v: "Never", good: true },
    aggregator: { v: "Yes", good: false },
    chatbot: { v: "No", good: true },
  },
  {
    label: "Customer login / OTP",
    us: { v: "Auto — none", good: true },
    aggregator: { v: "Account + OTP", good: false },
    chatbot: { v: "Usually required", good: false },
  },
  {
    label: "Ordering experience",
    us: { v: "Full visual menu, photos", good: true },
    aggregator: { v: "Inside their app", good: false },
    chatbot: { v: "Type items in chat", good: false },
  },
  {
    label: "Sends from your own number",
    us: { v: "Yes", good: true },
    aggregator: { v: "No", good: false },
    chatbot: { v: "Sometimes", good: true },
  },
  {
    label: "Live order + delivery tracking",
    us: { v: "On WhatsApp", good: true },
    aggregator: { v: "In their app", good: false },
    chatbot: { v: "Rarely", good: false },
  },
  {
    label: "You own the customer data",
    us: { v: "Yes, fully", good: true },
    aggregator: { v: "No", good: false },
    chatbot: { v: "Partial", good: false },
  },
  {
    label: "Setup time",
    us: { v: "Minutes", good: true },
    aggregator: { v: "Weeks of onboarding", good: false },
    chatbot: { v: "Days + scripting", good: false },
  },
];

const FAQ = [
  {
    q: "Do my customers need to install anything?",
    a: "No. As long as they have WhatsApp, they can order. They send “Hi”, tap the Order Now link and they’re on your menu — already signed in. There is no app to download and no account to create.",
  },
  {
    q: "Does the customer type their order inside the chat?",
    a: "No — and that’s the point. WhatsApp is the front door, not the checkout. The “Hi” gets them an instant link to your real visual menu with photos, categories and search, so ordering is fast and mistakes are rare. Status updates then come back on WhatsApp.",
  },
  {
    q: "Can it send from my own WhatsApp number?",
    a: "Yes. You can connect your own WhatsApp Business number through Meta’s official onboarding in a few minutes — including a number you already use on the WhatsApp Business app. Prefer zero setup? Go live instantly on our shared number and switch later.",
  },
  {
    q: "Is the ordering link safe to share?",
    a: "Each link is cryptographically signed, expires in minutes and locks to the first person who opens it. If someone forwards it, it simply won’t work for anyone else — so a logged-in session can never leak.",
  },
  {
    q: "What does the customer receive after ordering?",
    a: "Automatic WhatsApp messages for every stage: order received with the full bill, accepted, food ready, out for delivery with a live tracking link, completed, and loyalty points earned (if you run loyalty).",
  },
  {
    q: "How much commission does Menuthere take?",
    a: "Zero commission on orders. WhatsApp ordering is part of your own direct channel — you keep 100% of every order value, and payments settle straight to your bank.",
  },
];

/* --------------------------------- page ----------------------------------- */

export default function WhatsAppOrderingPage() {
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
    name: "Menuthere WhatsApp Ordering",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, WhatsApp",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    description:
      "WhatsApp ordering system for restaurants. Customers send 'Hi' to get an instant auto-login link, order from a visual web menu, and receive live order-status updates on WhatsApp.",
    url: CANONICAL,
  };

  return (
    <main className="min-h-screen w-full bg-white geist-font">
      <JsonLd data={faqLd} />
      <JsonLd data={productLd} />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden bg-[#fcfbf7] pt-28 md:pt-36 pb-16 md:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 100% 0%, rgba(37,211,102,0.10) 0%, rgba(37,211,102,0.04) 35%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-12">
          {/* copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/30 bg-white px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[#0f9d58] shadow-sm">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Ordering
              <span className="ml-1 rounded bg-[#25D366] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                NEW
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-stone-900 md:text-[3.4rem]">
              Your customers order by{" "}
              <span className="text-[#0f9d58]">just sending “Hi.”</span>
            </h1>

            <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-stone-600">
              Turn your WhatsApp number into your easiest ordering channel. A
              single “Hi” gives every customer an instant, auto-login link to
              your menu — no app to install, no signup, no OTP. You keep the
              customer and pay zero commission.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonV2 href="/get-started" variant="primary">
                Get Started Free
              </ButtonV2>
              <ButtonV2 href="https://cal.id/menuthere" variant="secondary">
                Book a Demo
              </ButtonV2>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13.5px] font-medium text-stone-600">
              {["No app download", "No signup or OTP", "0% commission"].map(
                (b) => (
                  <span key={b} className="inline-flex items-center gap-1.5">
                    <span className="inline-grid h-4 w-4 place-items-center rounded-full bg-[#25D366]/15 text-[#0f9d58]">
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
          <h2 className="text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">
            Send “Hi.” <span className="text-stone-500">That’s the funnel.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-500">
            The biggest reason carts get abandoned is friction — downloads,
            signups, passwords. WhatsApp ordering removes all of it. Four steps,
            and the customer never leaves a channel they already trust.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-stone-200 bg-white p-6 transition-colors hover:border-stone-300"
            >
              <span className="text-[13px] font-bold tracking-wider text-stone-300">
                {s.n}
              </span>
              <div className="mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/12">
                <s.icon className="h-5 w-5 text-[#0f9d58]" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold text-stone-900">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-stone-500">
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
          <h2 className="text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">
            Built to convert,{" "}
            <span className="text-stone-500">not just to chat.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-500">
            Everything you need to run ordering over WhatsApp like a pro — on
            your brand, on your terms.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-stone-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100/70">
                <f.icon className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-stone-900">
                {f.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-500">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────── Friction comparison ─────────────────────── */}
      <section className="bg-[#fcfbf7]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24 lg:px-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h2 className="text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">
                Count the taps.{" "}
                <span className="text-stone-500">Customers do.</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-stone-500">
                Every extra step between hungry and ordered is a customer you
                lose. Here’s the same order, two ways.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-stone-400">
                  Aggregator app
                </p>
                <ol className="mt-3 space-y-2 text-[13.5px] text-stone-500">
                  {[
                    "Install the app",
                    "Sign up + verify OTP",
                    "Search for your restaurant",
                    "Order (they pay 20–33%)",
                    "You never see the customer",
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

              <div className="rounded-2xl border-2 border-[#25D366]/40 bg-white p-5 shadow-[0_12px_30px_-18px_rgba(37,211,102,0.6)]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[#0f9d58]">
                  WhatsApp ordering
                </p>
                <ol className="mt-3 space-y-2 text-[13.5px] text-stone-700">
                  {[
                    "Send “Hi”",
                    "Tap Order Now (auto signed-in)",
                    "Order on your menu",
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
                  100% of the order value stays with you.
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
          <h2 className="text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">
            How it stacks up.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-500">
            Menuthere WhatsApp ordering vs. food aggregators vs. generic
            “chatbot” ordering tools.
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
                  Food aggregators
                </th>
                <th className="w-[24%] px-4 py-4 text-[14px] font-semibold text-stone-500">
                  Generic chatbots
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
              stat: "≈ 10 sec",
              label: "From “Hi” to a live ordering link in the customer’s hand.",
            },
            {
              icon: IndianRupee,
              stat: "0%",
              label: "Commission. Every rupee of the order value stays yours.",
            },
            {
              icon: Truck,
              stat: "End-to-end",
              label: "Placed → accepted → out for delivery → tracked, all on WhatsApp.",
            },
          ].map((o) => (
            <div
              key={o.stat}
              className="rounded-2xl border border-stone-200 bg-[#fcfbf7] p-7"
            >
              <o.icon className="h-6 w-6 text-[#0f9d58]" />
              <p className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
                {o.stat}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-stone-500">
                {o.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px w-full bg-stone-200" />

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h2 className="text-center text-3xl font-semibold leading-tight text-stone-900 md:text-4xl">
          Questions, answered.
        </h2>
        <Accordion type="single" collapsible className="mt-10 w-full">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-stone-200">
              <AccordionTrigger className="text-left text-[15px] font-semibold text-stone-900 hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-relaxed text-stone-600">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] text-stone-500">
            Ready to let customers order with a single “Hi”?
          </p>
          <div className="flex items-center gap-3">
            <ButtonV2 href="/get-started" variant="primary">
              Get Started Free
            </ButtonV2>
            <Link
              href="/solutions/petpooja"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-stone-600 hover:text-stone-900"
            >
              Explore zero-commission ordering
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <StartFreeTrailSection
        theme="whatsapp"
        heading="Launch your WhatsApp ordering system in under 2 minutes."
        description="Connect your WhatsApp number, upload your menu, and let customers order with a single “Hi” — auto-login link, live status updates, and zero commission. Join 600+ restaurants already growing with Menuthere."
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
