import { Metadata } from "next";
import HelpCenterFacebook from "./FacebookSupport";
import HelpCenterContactForm from "./ContactForm";
import HelpCenterWhatsApp from "./WhatsAppSupport";
import { JsonLd } from "@/components/seo/JsonLd";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

import { headers } from "next/headers";
import { getDomainConfig } from "@/lib/domain-utils";

export async function generateMetadata(): Promise<Metadata> {
    const headersList = await headers();
    const host = headersList.get("host");
    const config = getDomainConfig(host);

    return {
        title: `Help & Support | ${config.name}`,
        description: `Get help with your ${config.name} digital menu. FAQs, WhatsApp support, and email contact form. Quick answers to common questions about menu management, offers, and more.`,
        openGraph: {
            title: `Help & Support | ${config.name}`,
            description: `Get help with your ${config.name} digital menu. FAQs, contact form, and WhatsApp support.`,
            type: "website",
        },
    };
}

const FAQS = [
    {
        question: "How do I stop customers finding old menus on Google or apps?",
        answer: "All changes—like products, prices, descriptions, or availability—are applied instantly to your digital menu. Verify by clicking View Menu from your dashboard; no delays or reprints needed."
    },
    {
        question: "Out-of-stock items still show on my QR/digital menu—what gives?",
        answer: "In the Menu section, click Availability at the top. Toggle entire categories or individual items on/off with a single click—sold-out items vanish everywhere immediately."
    },
    {
        question: "Updating menus takes forever and costs a fortune in designers.",
        answer: "Editing is extremely simple and takes seconds—no technical knowledge required. Go to the Menu section, click any product to update name, price, image, description, offers, or variants, then save. Changes go live instantly."
    },
    {
        question: "How do I instantly update my menu products?",
        answer: "Go to the Menu section in your dashboard. You’ll see all categories and products listed—click any to edit details like name, price, image, or description, then save for instant updates."
    },
    {
        question: "How do I rearrange menu items or categories?",
        answer: "Open the Menu section and click Priority. Drag or set priority numbers for categories and items, then save—the new order appears live right away."
    },
    {
        question: "How do I add offers or specials to menu items?",
        answer: "For Specials/Best Sellers: In Menu section, toggle the option per item—they’ll appear as Must-Try at the top. For custom offers: Go to Offers section, create single/multi-item deals, and they activate instantly."
    },
    {
        question: "Hard to update banners or product images without tech help?",
        answer: "Navigate to Settings → General Settings to upload/change your restaurant banner. For products, edit images directly in the Menu section—drag-and-drop simple, live immediately."
    },
    {
        question: "Can I preview or schedule changes like daily specials easily?",
        answer: "Yes—preview any edit via View Menu before saving. For scheduling, use the Offers section to set timed updates (e.g., daily specials)—automate without daily logins."
    },
    {
        question: "Will I be able to turn the store off during offline hours?",
        answer: "Yes. Go to Settings and toggle your restaurant off anytime—perfect for offline hours, closures, or maintenance. Toggle back on when ready."
    },
    {
        question: "How easy is it overall to edit menu items?",
        answer: "Extremely—seconds per change. Update prices, names, images, availability, or offers via intuitive toggles/dropdowns in the Menu section, no coding or designers."
    },
    {
        question: "Can I cancel my subscription at any time?",
        answer: "Yes—cancel anytime from your account. Your plan stays active until the current billing period ends, with no further charges unless you renew."
    }
];

export default function HelpCenterPage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQS.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <div className="py-36 px-5 sm:px-0">
            <JsonLd data={faqSchema} />
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="space-y-2 text-center pb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
                    <p className="text-muted-foreground">
                        Need assistance? Reach out to us via email or chat directly on WhatsApp.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Form */}
                    <HelpCenterContactForm />

                    {/* Chat Support Options */}
                    <div className="flex flex-col gap-4">
                        <div className="flex-1">
                            <HelpCenterWhatsApp />
                        </div>
                        <div className="flex-1">
                            <HelpCenterFacebook />
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border space-y-4">
                    <h3 className="font-semibold text-foreground">Common Questions</h3>
                    <Accordion type="single" collapsible className="w-full">
                        {FAQS.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border-b border-border last:border-0"
                            >
                                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-3">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground pb-4">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </div>
    );
}
