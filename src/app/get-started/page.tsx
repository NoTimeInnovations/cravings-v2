"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Upload,
    ChevronRight,
    Check,
    UtensilsCrossed,
    ArrowLeft,
} from "lucide-react";
import { GoogleGenerativeAI, Schema } from "@google/generative-ai";
import { toast } from "sonner";
import { CompactMenuPreview } from "@/components/get-started/CompactMenuPreview";
import { useRouter } from "next/navigation";

// --- Types ---
interface MenuItem {
    name: string;
    price: number;
    description: string;
    category: string;
    image?: string;
    variants?: { name: string; price: number }[];
    is_veg?: boolean;
}

interface HotelDetails {
    name: string;
    banner?: string;
    phone: string;
    country: string;
}

// --- Constants ---
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export default function GetStartedPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [menuImage, setMenuImage] = useState<File | null>(null);
    const [menuImagePreview, setMenuImagePreview] = useState<string | null>(null);
    const [hotelDetails, setHotelDetails] = useState<HotelDetails>({
        name: "",
        phone: "",
        country: "",
    });
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedItems, setExtractedItems] = useState<MenuItem[]>([]);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const extractionPromise = useRef<Promise<MenuItem[]> | null>(null);



    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (step !== 1) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        setMenuImage(blob);
                        setMenuImagePreview(URL.createObjectURL(blob));
                        toast.success("Image pasted successfully!");
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [step]);

    // --- Handlers ---

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMenuImage(file);
            setMenuImagePreview(URL.createObjectURL(file));
        }
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setBannerPreview(URL.createObjectURL(file));
            // In a real app, we'd upload this. For demo, we use the object URL.
            setHotelDetails((prev) => ({
                ...prev,
                banner: URL.createObjectURL(file),
            }));
        }
    };

    const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setHotelDetails((prev) => ({ ...prev, [name]: value }));
    };

    const extractMenu = async (): Promise<MenuItem[]> => {
        if (!menuImage) throw new Error("No menu image provided");

        setIsExtracting(true);
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                price: { type: "number" },
                                description: { type: "string" },
                                category: { type: "string" },
                                variants: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            price: { type: "number" },
                                        },
                                        required: ["name", "price"],
                                    },
                                },
                            },
                            required: ["name", "price", "description", "category"],
                        },
                    } as Schema,
                },
            });

            const prompt = `Extract each distinct dish as a separate item from the provided images. 
      For each item, provide:
      - name: The name of the dish.
      - price: The minimum price.
      - description: A short, appetizing description (max 10 words).
      - category: The main heading.
      - variants: (Optional) Array of {name, price} for sizes.`;

            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.readAsDataURL(menuImage);
            });

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64, mimeType: menuImage.type } },
            ]);

            const parsedMenu = JSON.parse(result.response.text());
            console.log("Extracted menu", parsedMenu);
            setExtractedItems(parsedMenu);
            return parsedMenu;
        } catch (error) {
            console.error("Extraction failed:", error);
            toast.error("Failed to extract menu. Please try again.");
            throw error;
        } finally {
            setIsExtracting(false);
        }
    };

    const handleStep1Next = () => {
        if (!menuImage) return;

        // Start extraction in background
        extractionPromise.current = extractMenu().catch((err) => {
            console.error("Background extraction failed silently:", err);
            return []; // Return empty array on failure to avoid unhandled rejection
        });

        setStep(2);
    };

    const handleNextToExtraction = async () => {
        if (!hotelDetails.name || !hotelDetails.phone) {
            toast.error("Please fill in all details");
            return;
        }

        // Move to step 3 immediately without waiting
        setStep(3);

        // Wait for extraction in the background
        try {
            if (extractionPromise.current) {
                await extractionPromise.current;
            } else {
                await extractMenu();
            }
        } catch (error) {
            // Error is already handled in extractMenu toast
        }
    };

    const handlePublish = () => {
        setStep(4); // Move to pricing
    };

    const handleBuyNow = () => {
        console.log("buy initiated");
        toast.success("Buy initiated! (Check console)");
    };

    // --- Render Steps ---

    const renderStep1 = () => (
        <div className="max-w-md mx-auto text-center space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                    Upload Your Menu
                </h1>
                <p className="text-sm md:text-base text-gray-500">
                    Take a photo of your menu and we'll digitize it instantly.
                </p>
            </div>

            <div className={`border-2 border-dashed rounded-3xl p-6 md:p-10 transition-colors cursor-pointer relative group ${menuImage ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-4">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${menuImage ? "bg-green-100" : "bg-orange-100"}`}>
                        {menuImage ? (
                            <Check className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                        ) : (
                            <Upload className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-gray-900 text-sm md:text-base">
                            {menuImage ? "1 Image Selected" : "Click to upload, drag & drop, or paste"}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500">
                            {menuImage ? "Click to change" : "JPG, PNG up to 10MB"}
                        </p>
                    </div>
                </div>
            </div>

            <Button
                onClick={handleStep1Next}
                disabled={!menuImage}
                className="w-full h-10 md:h-11 text-base md:text-lg rounded-full bg-orange-600 hover:bg-orange-700"
            >
                Next Step <ChevronRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
            </Button>
        </div>
    );

    const renderStep2 = () => (
        <div className="max-w-md mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="sm:text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                    Restaurant Details
                </h1>
                <p className="text-sm md:text-base text-gray-500">
                    Tell us a bit about your place to personalize your menu.
                </p>
            </div>

            <div className="space-y-2 md:space-y-6 bg-white rounded-3xl">
                <div className="space-y-2">
                    <Label htmlFor="banner" className="text-sm">Banner Image (Optional)</Label>
                    <div className="border border-gray-200 rounded-xl p-3 md:p-4 flex items-center gap-4 relative overflow-hidden">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {bannerPreview ? (
                            <img
                                src={bannerPreview}
                                alt="Banner"
                                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Upload size={20} className="text-gray-400" />
                            </div>
                        )}
                        <div className="flex-1">
                            <p className="text-sm font-medium">Upload Banner</p>
                            <p className="text-xs text-gray-500">Recommended 800x400px</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Restaurant Name</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="e.g. The Burger Joint"
                        value={hotelDetails.name}
                        onChange={handleDetailsChange}
                        className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">WhatsApp Number</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={hotelDetails.phone}
                        onChange={handleDetailsChange}
                        className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm">Country</Label>
                    <Input
                        id="country"
                        name="country"
                        placeholder="e.g. India"
                        value={hotelDetails.country}
                        onChange={handleDetailsChange}
                        className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                    />
                </div>
            </div>

            <Button
                onClick={handleNextToExtraction}
                disabled={!hotelDetails.name || !hotelDetails.phone}
                className="w-full h-10 md:h-11 text-base md:text-lg rounded-full bg-orange-600 hover:bg-orange-700"
            >
                Create Menu <ChevronRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
            </Button>
        </div>
    );

    const renderStep3 = () => {
        // If still extracting, show loading state
        if (isExtracting || extractedItems.length === 0) {
            return (
                <div className="max-w-md mx-auto text-center space-y-8 animate-in fade-in duration-500 mt-12">
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                            <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            Extracting Your Menu
                        </h1>
                        <p className="text-gray-500">
                            Please wait while we process your menu image...
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-start gap-8 animate-in fade-in duration-700 md:pt-12">
                <div className="hidden md:block flex-1 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            Your Menu is Ready!
                        </h1>
                        <p className="text-gray-500">
                            We've extracted {extractedItems.length} items from your image.
                            Here's how it looks. You can edit the items in the dashboard after publishing.
                        </p>
                    </div>



                    <div className="hidden md:block">
                        <Button
                            onClick={handlePublish}
                            className="w-full h-14 text-lg rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                        >
                            Publish Live <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex justify-center relative">
                    <CompactMenuPreview items={extractedItems} hotelDetails={hotelDetails} />

                    {/* Mobile Publish Button (Fixed Bottom) */}
                    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                        <Button
                            onClick={handlePublish}
                            className="w-full h-12 text-base rounded-full bg-green-600 hover:bg-green-700 shadow-xl"
                        >
                            Publish Live <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderStep4 = () => (
        <div className="max-w-4xl mx-auto text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    Everything you need to run a digital menu. No hidden fees.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                {/* Free Tier */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900">Starter</h3>
                    <div className="mt-4 flex items-baseline justify-center text-gray-900">
                        <span className="text-5xl font-bold tracking-tight">Free</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                        Perfect for trying out the platform.
                    </p>
                    <ul className="mt-8 space-y-4 text-left">
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-green-500" />
                            <span className="text-gray-700">Up to 20 menu items</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-green-500" />
                            <span className="text-gray-700">Basic QR Code</span>
                        </li>
                    </ul>
                    <Button
                        variant="outline"
                        className="mt-8 w-full rounded-full"
                        onClick={() => toast.info("Free plan selected")}
                    >
                        Continue Free
                    </Button>
                </div>

                {/* Pro Tier */}
                <div className="bg-orange-50 p-8 rounded-3xl border-2 border-orange-100 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                        POPULAR
                    </div>
                    <h3 className="text-xl font-semibold text-orange-900">Pro</h3>
                    <div className="mt-4 flex items-baseline justify-center text-gray-900">
                        <span className="text-5xl font-bold tracking-tight">$25</span>
                        <span className="ml-1 text-xl text-gray-500">/mo</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">
                        For growing restaurants.
                    </p>
                    <ul className="mt-8 space-y-4 text-left">
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-orange-600" />
                            <span className="text-gray-700">Unlimited items</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-orange-600" />
                            <span className="text-gray-700">Custom Branding</span>
                        </li>
                        <li className="flex gap-3">
                            <Check className="h-5 w-5 text-orange-600" />
                            <span className="text-gray-700">Analytics & Insights</span>
                        </li>
                    </ul>
                    <Button
                        className="mt-8 w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-200"
                        onClick={handleBuyNow}
                    >
                        Buy Now
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Header */}
            <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {step > 1 && step < 4 && (
                            <button
                                onClick={() => setStep((s) => (s - 1) as any)}
                                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                        )}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                            <span className="text-xl font-bold text-gray-900">Cravings</span>
                        </div>
                    </div>
                    {step < 4 && (
                        <div className="text-sm font-medium text-gray-500">
                            Step {step} of 3
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className={`max-w-6xl mx-auto ${step === 3 ? "px-0 py-0 md:px-6" : step === 2 ? "px-6 py-6 sm:py-8" : "px-6 py-12"}`}>


                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </main>
        </div>
    );
}
