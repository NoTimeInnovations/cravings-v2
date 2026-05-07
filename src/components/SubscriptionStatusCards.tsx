import React from "react";
import { AlertTriangle, Clock, Ban, Phone } from "lucide-react";

interface PartnerContact {
    partnerPhone?: string | null;
    partnerName?: string | null;
}

interface StatusCardProps extends PartnerContact {
    title: string;
    description: string;
    icon: React.ElementType;
    iconColor: string;
    action?: React.ReactNode;
}

const formatOwnerLabel = (name?: string | null) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return "the owner";
    return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
};

const ContactSection = ({ partnerPhone, partnerName }: PartnerContact) => {
    if (partnerPhone) {
        const ownerLabel = formatOwnerLabel(partnerName);
        return (
            <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                    Contact the Owner
                </p>
                <a
                    href={`tel:${partnerPhone}`}
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                    <Phone className="w-4 h-4" />
                    {partnerPhone}
                </a>
                <p className="text-xs text-gray-500 mt-2">
                    This is {ownerLabel} phone number
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
                Contact Support
            </p>
            <a
                href="tel:+919447156765"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
                <Phone className="w-4 h-4" />
                +91 9447156765
            </a>
        </div>
    );
};

const StatusCard = ({
    title,
    description,
    icon: Icon,
    iconColor,
    action,
    partnerPhone,
    partnerName,
}: StatusCardProps) => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-8 font-sans">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl w-full max-w-md mx-auto border border-gray-100">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-opacity-10 ${iconColor.replace('text-', 'bg-')}`}>
                <Icon className={`w-10 h-10 ${iconColor}`} />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">
                {title}
            </h1>
            <p className="mb-8 text-gray-500 leading-relaxed">
                {description}
            </p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}

            <ContactSection partnerPhone={partnerPhone} partnerName={partnerName} />
        </div>
    </div>
);

export const SubscriptionExpiredCard = ({ partnerPhone, partnerName }: PartnerContact = {}) => (
    <StatusCard
        title="Subscription Expired"
        description="This hotel's subscription plan has expired. Service is temporarily suspended until the plan is renewed."
        icon={Clock}
        iconColor="text-orange-500"
        partnerPhone={partnerPhone}
        partnerName={partnerName}
    />
);

export const SubscriptionInactiveCard = ({ partnerPhone, partnerName }: PartnerContact = {}) => (
    <StatusCard
        title="Account Inactive"
        description="This hotel account is currently inactive. Please contact support to reactivate services."
        icon={Ban}
        iconColor="text-red-500"
        partnerPhone={partnerPhone}
        partnerName={partnerName}
    />
);

export const ScanLimitReachedCard = ({ partnerPhone, partnerName }: PartnerContact = {}) => (
    <StatusCard
        title="Scan Limit Reached"
        description="This restaurant has reached its monthly scan limit for the Free Plan. Please upgrade to continue."
        icon={AlertTriangle}
        iconColor="text-yellow-500"
        partnerPhone={partnerPhone}
        partnerName={partnerName}
    />
);
