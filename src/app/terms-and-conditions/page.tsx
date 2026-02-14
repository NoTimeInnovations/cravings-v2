import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms & Conditions | Menuthere Digital Menu",
    description: "Terms and conditions for using Menuthere Digital Menu services.",
};

const TermsAndConditionsPage = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 py-20">
            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
                <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <p>
                        Welcome to Menuthere, a product of <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong>. By accessing or using our digital menu platform (“Service”), you agree to the following Terms & Conditions. Please read them carefully.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">1. About the Service</h2>
                        <p>
                            Menuthere provides an online platform where restaurants can create, edit, and manage digital menus accessible via QR codes. Optional features include menu customization, availability controls, offer displays, and table/WhatsApp ordering.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Eligibility</h2>
                        <p>
                            You must be a restaurant owner, authorized staff member, or individual legally allowed to enter into agreements on behalf of a business.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Account Registration</h2>
                        <p>
                            You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and all activity under your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Subscription & Billing</h2>
                        <p className="mb-2">Menuthere operates on a subscription model.</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Fees must be paid upfront for each billing cycle.</li>
                            <li>Plans automatically renew unless cancelled before the renewal date.</li>
                            <li>Upgrades or downgrades may adjust the billing amount.</li>
                            <li>All payments are processed securely through third-party providers such as Paddle.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Acceptable Use</h2>
                        <p className="mb-2">You agree NOT to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Upload unlawful, misleading, or copyrighted content without permission.</li>
                            <li>Use the service for fraudulent activity.</li>
                            <li>Interfere with platform security or functionality.</li>
                            <li>Impersonate another business or individual.</li>
                        </ul>
                        <p className="mt-2">
                            We reserve the right to remove content or suspend accounts that violate these policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Intellectual Property</h2>
                        <p>
                            All software, branding, and platform features belong to Menuthere. Restaurants retain ownership of their menu content, images, and business information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Service Availability</h2>
                        <p>
                            We strive for uninterrupted service but do not guarantee 100% uptime. Maintenance, upgrades, or external issues may occasionally affect availability.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Limitation of Liability</h2>
                        <p className="mb-2">Menuthere is not responsible for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Loss of revenue due to inaccurate menu content entered by the user</li>
                            <li>Customer disputes between restaurants and diners</li>
                            <li>Third-party payment issues</li>
                            <li>Business losses arising from misuse of the Service</li>
                        </ul>
                        <p className="mt-2">Liability is limited to the amount paid during the last billing cycle.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Termination</h2>
                        <p>
                            You may cancel anytime. We may suspend or terminate accounts that violate policies, misuse the platform, or fail to pay subscription fees.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Governing Law</h2>
                        <p>
                            These Terms are governed by the laws of India, without regard to conflict-of-law principles.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Changes to Terms</h2>
                        <p>
                            We may update these Terms at any time. Continued use of the Service indicates acceptance.
                        </p>
                        <p className="mt-4 font-medium">
                            For questions, contact: <a href="mailto:menuthere@gmail.com" className="text-orange-600 hover:underline">menuthere@gmail.com</a>
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default TermsAndConditionsPage;
