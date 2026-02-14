"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageSquare, Send } from "lucide-react";

export function AdminV2HelpSupport() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [sending, setSending] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);

        try {
            const response = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error('Failed to send message');

            toast.success("Message sent successfully! We'll get back to you soon.");
            setFormData({ name: "", email: "", subject: "", message: "" });
        } catch (error) {
            console.error('Support form error:', error);
            toast.error("Failed to send message. Please try again or contact us on WhatsApp.");
        } finally {
            setSending(false);
        }
    };

    const handleWhatsAppChat = () => {
        const supportNumber = "918590115462";
        const message = "Hi! I need help with the Menuthere Admin Dashboard.";
        const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
                <p className="text-muted-foreground">
                    Need assistance? Reach out to us via email or chat directly on WhatsApp.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Contact Form */}
                <div className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-600 dark:text-orange-400">
                            <Mail size={24} />
                        </div>
                        <h2 className="text-xl font-semibold">Email Us</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Your Name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="rounded-xl bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="your@email.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="rounded-xl bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                name="subject"
                                placeholder="How can we help?"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                className="rounded-xl bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="Describe your issue..."
                                value={formData.message}
                                onChange={handleChange}
                                required
                                className="min-h-[120px] rounded-xl bg-background"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={sending}
                            className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {sending ? "Sending..." : "Send Message"} <Send className="ml-2 w-4 h-4" />
                        </Button>
                    </form>
                </div>

                {/* WhatsApp Support */}
                <div className="space-y-6">
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
    );
}
