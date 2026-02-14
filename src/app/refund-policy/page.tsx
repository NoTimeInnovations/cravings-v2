import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Refund Policy | Menuthere Digital Menu",
    description: "Refund policy for Menuthere Digital Menu. Understand our 14-day refund eligibility and cancellation terms.",
};

const RefundPolicyPage = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 py-20">
            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-bold mb-4">Refund Policy</h1>
                <p className="text-gray-500 mb-8">Last Updated: 1/21/2026</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <p>
                        Menuthere, operated by <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong> ("we", "our", "us"), offers a 14-day refund policy for eligible purchases. This policy explains when and how refunds are processed.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Eligibility for Refunds</h2>
                        <p className="mb-2">You are eligible for a refund if:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>The refund request is made within 14 days of the original purchase date</li>
                            <li>
                                The service has not been substantially used, including but not limited to:
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                    <li>Active deployment of digital menus</li>
                                    <li>Extensive menu uploads or QR code distribution</li>
                                    <li>Commercial use beyond initial testing</li>
                                </ul>
                            </li>
                            <li>The account is in good standing and not involved in abuse, fraud, or policy violations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Non-Refundable Situations</h2>
                        <p className="mb-2">Refunds will not be issued if:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>The 14-day refund window has passed</li>
                            <li>The service has been fully used or consumed</li>
                            <li>The account was suspended or terminated due to policy violations</li>
                            <li>Fees are related to custom services, add-ons, or third-party charges</li>
                            <li>Refunds are restricted by the payment provider's policies</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">3. How to Request a Refund</h2>
                        <p className="mb-2">To request a refund:</p>
                        <p className="mb-2">
                            Email us at <a href="mailto:menuthere@gmail.com" className="text-orange-600 hover:underline">menuthere@gmail.com</a>
                        </p>
                        <p className="mb-2">Include:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Registered email address</li>
                            <li>Purchase receipt or transaction ID</li>
                            <li>Reason for refund</li>
                        </ul>
                        <p className="mt-4 text-sm text-gray-500 italic">We may request additional information to verify eligibility.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Refund Processing</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Approved refunds are processed through the original payment method</li>
                            <li>Refunds are handled by our payment provider (e.g., Paddle)</li>
                            <li>Processing time may take 5–10 business days, depending on your bank or provider</li>
                            <li>We do not control delays caused by third-party payment processors</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Partial Refunds</h2>
                        <p>
                            In certain cases, we may issue partial refunds if the service has been partially used within the 14-day period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Subscription Cancellations</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You may cancel your subscription at any time</li>
                            <li>Cancellation stops future billing but does not automatically trigger a refund</li>
                            <li>Refunds are only issued if the request meets the 14-day eligibility criteria</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Changes to This Policy</h2>
                        <p>
                            We reserve the right to update this Refund Policy at any time. Changes will be posted on this page with an updated revision date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Contact Us</h2>
                        <p>
                            For questions or refund requests, contact:
                        </p>
                        <p className="mt-2 font-medium">
                            📧 <a href="mailto:menuthere@gmail.com" className="text-orange-600 hover:underline">menuthere@gmail.com</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicyPage;
