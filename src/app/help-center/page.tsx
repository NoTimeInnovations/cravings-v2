import { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import HelpCenterFacebook from "./FacebookSupport";
import HelpCenterContactForm from "./ContactForm";
import HelpCenterWhatsApp from "./WhatsAppSupport";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export async function generateMetadata(): Promise<Metadata> {
    const { t } = await getT();
    return {
        title: t.helpCenter.metaTitle,
        description: t.helpCenter.metaDescription,
        alternates: { canonical: "https://menuthere.com/help-center" },
        openGraph: {
            title: t.helpCenter.metaTitle,
            description: t.helpCenter.metaDescription,
            url: "https://menuthere.com/help-center",
            type: "website",
        },
    };
}

export default async function HelpCenterPage() {
    const { t } = await getT();

    const FAQS = [
        {
            question: t.helpCenter.faq1Question,
            answer: t.helpCenter.faq1Answer
        },
        {
            question: t.helpCenter.faq2Question,
            answer: t.helpCenter.faq2Answer
        },
        {
            question: t.helpCenter.faq3Question,
            answer: t.helpCenter.faq3Answer
        },
        {
            question: t.helpCenter.faq4Question,
            answer: t.helpCenter.faq4Answer
        },
        {
            question: t.helpCenter.faq5Question,
            answer: t.helpCenter.faq5Answer
        },
        {
            question: t.helpCenter.faq6Question,
            answer: t.helpCenter.faq6Answer
        },
        {
            question: t.helpCenter.faq7Question,
            answer: t.helpCenter.faq7Answer
        },
        {
            question: t.helpCenter.faq8Question,
            answer: t.helpCenter.faq8Answer
        },
        {
            question: t.helpCenter.faq9Question,
            answer: t.helpCenter.faq9Answer
        },
        {
            question: t.helpCenter.faq10Question,
            answer: t.helpCenter.faq10Answer
        },
        {
            question: t.helpCenter.faq11Question,
            answer: t.helpCenter.faq11Answer
        }
    ];

    return (
        <div className="min-h-screen w-full bg-white geist-font">

            {/* Hero Header */}
            <section className="flex items-center justify-center px-5 pb-16 pt-32 md:pt-40 bg-[#fcfbf7]">
                <div className="w-full max-w-2xl mx-auto text-center">
                    <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
                        {t.helpCenter.heroTitle}{" "}
                        <span className="text-stone-500 italic">{t.helpCenter.heroTitleAccent}</span>
                    </h1>
                    <p className="geist-font text-lg text-stone-500 max-w-md mx-auto mt-5 leading-relaxed">
                        {t.helpCenter.heroSubtitle}
                    </p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px bg-stone-200" />

            {/* Contact & Support */}
            <section className="bg-white border-l border-r border-stone-200 sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto py-16">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        <HelpCenterContactForm />
                        <div className="flex flex-col gap-4">
                            <div className="flex-1">
                                <HelpCenterWhatsApp />
                            </div>
                            <div className="flex-1">
                                <HelpCenterFacebook />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full h-px bg-stone-200" />

            {/* FAQ Section */}
            <section className="py-24 bg-white sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto border-r border-l border-stone-200">
                <div className="max-w-3xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-14">
                        <h2 className="geist-font text-3xl md:text-5xl font-semibold text-gray-900 tracking-tight">
                            {t.helpCenter.faqSectionTitle}{" "}
                            <span className="text-gray-400 italic">{t.helpCenter.faqSectionTitleAccent}</span>
                        </h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        {FAQS.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border-b border-gray-200 last:border-b-0 py-1"
                            >
                                <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:no-underline py-5">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-gray-600 text-sm leading-relaxed pb-5">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </section>

            {/* CTA */}
            <StartFreeTrailSection />

            {/* Footer */}
            <Footer appName="Menuthere" />

            {/* Chat */}
            <WhatsAppButton />
        </div>
    );
}
