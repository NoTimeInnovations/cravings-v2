import HelpCenterContactForm from "./ContactForm";
import HelpCenterWhatsApp from "./WhatsAppSupport";

export default function HelpCenterPage() {
    return (
        <div className="py-36 px-5 sm:px-0">
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

                    {/* WhatsApp Support & FAQ */}
                    <div className="space-y-6">
                        <HelpCenterWhatsApp />

                        <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border space-y-4">
                            <h3 className="font-semibold text-foreground">Common Questions</h3>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex gap-2">
                                    <span className="text-orange-500">•</span>
                                    How do I update my menu prices?
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-orange-500">•</span>
                                    How to change my restaurant banner?
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-orange-500">•</span>
                                    Issues with order notifications?
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
