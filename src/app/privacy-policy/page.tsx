import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | Cravings Digital Menu",
    description: "Privacy policy for Cravings Digital Menu. Learn how we collect, use, and protect your data.",
};

const PrivacyPolicyPage = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 py-20">
            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <p>
                        Cravings, operated by <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong> (“we”, “our”, “us”), is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Account Information:</strong> Name, email, password, restaurant name, business details.</li>
                            <li><strong>Menu Content:</strong> Items, prices, images, offers, descriptions.</li>
                            <li><strong>Usage Data:</strong> Device info, browser type, pages visited, actions taken.</li>
                            <li><strong>Payment Data:</strong> Processed securely by third-party providers (e.g., Paddle). We do not store card details.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
                        <p className="mb-2">We use information to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide and improve our digital menu services</li>
                            <li>Authenticate accounts</li>
                            <li>Communicate updates, support replies, or billing notices</li>
                            <li>Generate QR menus and configuration data</li>
                            <li>Prevent fraud and ensure platform security</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Sharing of Personal Data</h2>
                        <p className="mb-2">We ONLY share data with:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Payment processors (e.g., Paddle) for billing</li>
                            <li>Hosting providers (for storing menu data)</li>
                            <li>Analytics tools for improving performance</li>
                        </ul>
                        <p className="mt-2 text-sm text-gray-500 italic">We do NOT sell personal information.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Data Security</h2>
                        <p>
                            We use encryption, secure authentication, and third-party compliant services to protect your data. However, no system is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Data Retention</h2>
                        <p>
                            We retain user data as long as the account is active or as required for legal, accounting, and operational purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Your Rights</h2>
                        <p className="mb-2">Depending on your location, you may have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Access your data</li>
                            <li>Update or correct your data</li>
                            <li>Request deletion</li>
                            <li>Request export of your data</li>
                            <li>Opt out of marketing emails</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Children’s Privacy</h2>
                        <p>
                            Cravings is not intended for individuals under 18.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">8. International Data Transfers</h2>
                        <p>
                            Your data may be transferred and processed outside your country through secure and compliant service providers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Updates to Policy</h2>
                        <p>
                            We may update this policy when needed. Changes will appear on this page.
                        </p>
                        <p className="mt-4 font-medium">
                            Questions? Contact <a href="mailto:support@cravings.live" className="text-orange-600 hover:underline">support@cravings.live</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
