"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function HelpCenterWhatsApp() {
    const handleWhatsAppChat = () => {
        const supportNumber = "918590115462";
        const message = "Hi! I need help with Cravings.";
        const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <div className="bg-green-50 dark:bg-green-900/10 p-8 rounded-3xl border border-green-100 dark:border-green-900/20 flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full text-green-600 dark:text-green-400">
                <MessageSquare size={40} />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">Chat on WhatsApp</h2>
                <p className="text-gray-600 dark:text-muted-foreground text-sm">
                    Get instant support from our team. We are available 9 AM - 9 PM.
                </p>
            </div>
            <Button
                onClick={handleWhatsAppChat}
                className="h-12 px-8 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-none text-lg"
            >
                Chat with Us Now
            </Button>
        </div>
    );
}
