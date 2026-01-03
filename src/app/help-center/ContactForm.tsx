"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

export default function HelpCenterContactForm() {
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

    return (
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
    );
}
