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
import { CompactMenuPreview, ColorPalette } from "@/components/get-started/CompactMenuPreview";
import { useRouter } from "next/navigation";
import ColorThief from "colorthief";
import axios from "axios";

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
    const [isExtractingMenu, setIsExtractingMenu] = useState(false);
    const [extractedItems, setExtractedItems] = useState<MenuItem[]>([]);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const extractionPromise = useRef<Promise<MenuItem[]> | null>(null);
    const [colorPalettes, setColorPalettes] = useState<ColorPalette[]>([]);
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>({
        text: "#000000",
        background: "#ffffff",
        accent: "#ea580c",
    });
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authCredentials, setAuthCredentials] = useState({ email: "", password: "" });

    useEffect(() => {
        if (bannerPreview) {
            const img = new Image();
            img.src = bannerPreview;
            img.onload = () => {
                try {
                    const colorThief = new ColorThief();
                    const palette = colorThief.getPalette(img, 5);

                    if (palette) {
                        const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => {
                            const hex = x.toString(16);
                            return hex.length === 1 ? '0' + hex : hex;
                        }).join('');

                        const colors = palette.map((c: number[]) => ({
                            rgb: c,
                            hex: rgbToHex(c[0], c[1], c[2]),
                            brightness: (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000
                        }));

                        colors.sort((a: any, b: any) => b.brightness - a.brightness);

                        const getSaturation = (r: number, g: number, b: number) => {
                            const max = Math.max(r, g, b), min = Math.min(r, g, b);
                            if (max === min) return 0;
                            return (max - min) / max;
                        };

                        const vibrantColors = [...colors].sort((a: any, b: any) =>
                            getSaturation(b.rgb[0], b.rgb[1], b.rgb[2]) - getSaturation(a.rgb[0], a.rgb[1], a.rgb[2])
                        );

                        const accent = vibrantColors[0].hex;
                        const accent2 = vibrantColors[1]?.hex || accent;

                        const generated: ColorPalette[] = [
                            { text: "#000000", background: "#ffffff", accent: "#ea580c" }, // Default
                            { background: colors[0].hex, text: colors[colors.length - 1].hex, accent: accent }, // Light
                            { background: colors[colors.length - 1].hex, text: colors[0].hex, accent: accent }, // Dark
                            { background: colors[0].hex, text: "#000000", accent: accent2 } // Alternative
                        ];

                        setColorPalettes(generated);
                    }
                } catch (e) {
                    console.error("Color extraction failed", e);
                }
            };
        }
    }, [bannerPreview]);



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

    const fetchImagesInBackground = async (items: MenuItem[]) => {
        const partnerEmail = "default@partner.com"; // Public flow default
        const sanitizeToEnglish = (text: string): string => {
            return text.replace(/[^a-zA-Z0-9\s.,!?'"-]/g, '').trim();
        };

        const BATCH_SIZE = 3;

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const itemNames = batch.map(item => item.name);

            try {
                // Start generation for BATCH
                await axios.post(
                    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images-v2`,
                    {
                        lat: "28.6139",
                        lng: "77.2090",
                        itemNames,
                        partnerEmail
                    },
                    { headers: { "Content-Type": "application/json" } }
                );

                // Poll for completion
                let isComplete = false;
                let pollCount = 0;
                const maxPolls = 60; // Increased timeout for batch

                while (!isComplete && pollCount < maxPolls) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s interval
                    pollCount++;

                    const pingResponse = await axios.get(
                        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/image-v2/ping`,
                        { params: { partner: partnerEmail } }
                    );

                    if (pingResponse.data.status === "completed") {
                        isComplete = true;
                    } else if (pingResponse.data.status === "failed") {
                        throw new Error("Generation failed");
                    }
                }

                if (isComplete) {
                    // Fetch result
                    const resultsResponse = await axios.get(
                        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/image-v2/get`,
                        { params: { partner: partnerEmail } }
                    );

                    // Update State for all items in batch
                    setExtractedItems(currentItems => {
                        return currentItems.map(currentItem => {
                            // Check if this currentItem was in the batch
                            const batchItem = batch.find(b => b.name === currentItem.name);
                            if (batchItem) {
                                const itemName = sanitizeToEnglish(batchItem.name);
                                const imageUrls = resultsResponse.data[itemName] || [];
                                if (imageUrls.length > 0) {
                                    return { ...currentItem, image: imageUrls[0] };
                                }
                            }
                            return currentItem;
                        });
                    });
                }
            } catch (error) {
                console.error(`Background image fetch failed for batch starting at ${i}:`, error);
                // Continue to next batch
            }
        }
    };

    const extractMenu = async (): Promise<MenuItem[]> => {
        if (!menuImage) throw new Error("No menu image provided");

        setIsExtractingMenu(true);
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

            // Trigger background image fetch for first 10 items
            fetchImagesInBackground(parsedMenu);

            return parsedMenu;
        } catch (error) {
            console.error("Extraction failed:", error);
            toast.error("Failed to extract menu. Please try again.");
            throw error;
        } finally {
            setIsExtractingMenu(false);
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
        setShowAuthModal(true);
    };

    const handleFinalPublish = () => {
        if (!authCredentials.email || !authCredentials.password) {
            toast.error("Please enter email and password");
            return;
        }

        // Construct Partner Data
        const partnerData = {
            role: "partner",
            name: hotelDetails.name,
            password: authCredentials.password,
            email: authCredentials.email,
            store_name: hotelDetails.name,
            phone: hotelDetails.phone,
            country: hotelDetails.country,
            location: "",
            status: "active",
            upi_id: "",
            whatsapp_numbers: [],
            district: "",
            delivery_status: false,
            geo_location: { type: "Point", coordinates: [0, 0] },
            delivery_rate: 0,
            delivery_rules: { rules: [] },
            currency: "USD",
            is_shop_open: true,
            theme: JSON.stringify(selectedPalette),
        };

        // Construct Categories Data
        const uniqueCategories = Array.from(new Set(extractedItems.map(i => i.category)));
        const categoriesData = uniqueCategories.reduce((acc, catName, index) => {
            acc[catName] = {
                name: catName,
                priority: index,
                is_active: true,
                id: `temp-cat-${index}`
            };
            return acc;
        }, {} as Record<string, any>);

        // Construct Menu Data
        const menuData = {
            items: extractedItems.reduce((acc, item, index) => {
                const itemId = `temp-item-${index}`;
                acc[itemId] = {
                    name: item.name,
                    price: item.price,
                    description: item.description,
                    category: categoriesData[item.category],
                    image_url: item.image || "",
                    variants: item.variants || [],
                    is_veg: item.is_veg,
                    is_available: true,
                    is_top: false,
                    priority: index,
                    tags: [],
                    stocks: []
                };
                return acc;
            }, {} as Record<string, any>)
        };

        console.log("Publish Data:", {
            partner: partnerData,
            menu: menuData,
            categories: categoriesData
        });

        setShowAuthModal(false);
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
        if (isExtractingMenu || extractedItems.length === 0) {
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



                    <div className="hidden md:block space-y-6">
                        {colorPalettes.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-gray-700">Choose a Theme</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {colorPalettes.map((palette, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedPalette(palette)}
                                            className={`h-16 rounded-xl border-2 flex items-center justify-center relative overflow-hidden transition-all ${selectedPalette === palette ? "border-orange-600 ring-2 ring-orange-100" : "border-gray-200 hover:border-gray-300"
                                                }`}
                                            style={{ backgroundColor: palette.background }}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold" style={{ color: palette.text }}>Aa</span>
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.accent }} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handlePublish}
                            className="w-full h-14 text-lg rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                        >
                            Publish Live <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex justify-center relative w-full overflow-hidden">
                    <CompactMenuPreview items={extractedItems} hotelDetails={hotelDetails} colorPalette={selectedPalette} />

                    {/* Mobile Publish Button (Fixed Bottom) */}
                    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex flex-col gap-3">
                        {colorPalettes.length > 0 && (
                            <div className="bg-white/60 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-white/50">
                                <div className="flex justify-between items-center px-2">
                                    {colorPalettes.map((palette, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedPalette(palette)}
                                            className={`w-10 h-10 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${selectedPalette === palette ? "border-orange-600 scale-110 ring-2 ring-orange-100" : "border-white/50"
                                                }`}
                                            style={{ backgroundColor: palette.background }}
                                        >
                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: palette.accent }} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
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
        <div className="min-h-screen max-w-screen overflow-x-hidden bg-white font-sans">
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

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                            <p className="text-sm text-gray-500">Set up your credentials to manage your menu.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={authCredentials.email}
                                    onChange={(e) => setAuthCredentials(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={authCredentials.password}
                                    onChange={(e) => setAuthCredentials(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-full"
                                onClick={() => setShowAuthModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 rounded-full bg-orange-600 hover:bg-orange-700"
                                onClick={handleFinalPublish}
                            >
                                Confirm & Publish
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
