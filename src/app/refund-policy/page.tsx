import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Refund Policy | Cravings Digital Menu",
    description: "Refund policy for Cravings Digital Menu. Understand our refund eligibility and cancellation terms.",
};

const RefundPolicyPage = () => {
    return (
        <div className="min-h-screen bg-white text-gray-900 py-20">
            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-bold mb-4">Refund Policy</h1>
                <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <p>
                        Cravings (operated by <strong>INNOVIZE NOTIME PRIVATE LIMITED</strong>) is a SaaS product with monthly or yearly subscription plans. Our refund policy is designed to be fair while preventing abuse.
                    </p>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Free Trial</h2>
                        <p>
                            If a free trial is offered, no charges apply until the trial ends. You may cancel anytime before renewal to avoid payment.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Subscription Payments</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>All subscription fees are charged upfront for the selected billing cycle (monthly or yearly).</li>
                            <li>Because digital services are instantly accessible, payments are generally non-refundable.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Refund Eligibility</h2>
                        <p className="mb-2">A refund may be approved only in the following cases:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Duplicate payment</li>
                            <li>Technical issues that prevent product usage AND cannot be resolved</li>
                            <li>Accidental upgrade or incorrect plan selection reported within 48 hours</li>
                        </ul>

                        <p className="mt-4 mb-2">Refunds are not provided for:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Change of mind</li>
                            <li>Low usage or no usage</li>
                            <li>Restaurant business changes (closing, staff changes, etc.)</li>
                            <li>Missing features that are not advertised</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Cancellation</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You may cancel anytime. Your access continues until the end of the billing cycle.</li>
                            <li>Cancellation does not trigger a refund for past payments.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">5. How Refunds Are Issued</h2>
                        <p>
                            Refunds, if approved, are processed through your original payment provider (Paddle or others). Processing time depends on the payment method.
                        </p>
                        <p className="mt-4 font-medium">
                            For refund requests: <a href="mailto:support@cravings.live" className="text-orange-600 hover:underline">support@cravings.live</a>
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default RefundPolicyPage;
