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
    X,
    FileText,
    AlertCircle,
} from "lucide-react";
import { GoogleGenerativeAI, Schema } from "@google/generative-ai";
import { toast } from "sonner";
import { CompactMenuPreview, ColorPalette } from "@/components/get-started/CompactMenuPreview";
import { useRouter } from "next/navigation";
import axios from "axios";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import plansData from "@/data/plans.json";
import { Eye, EyeOff, Copy, ExternalLink, LayoutDashboard, Share2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import FullScreenLoader from "@/components/ui/FullScreenLoader";

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
    state?: string;
    district?: string;
    facebook_link?: string;
    instagram_link?: string;
    location_link?: string;
    currency: string;
}

// --- Constants ---
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const STORAGE_KEY = "cravings_onboarding_state";

const COUNTRY_META_DATA: Record<string, { code: string; currency: string; symbol: string }> = {
    "India": { code: "+91", currency: "INR", symbol: "₹" },
    "United States": { code: "+1", currency: "USD", symbol: "$" },
    "United Kingdom": { code: "+44", currency: "GBP", symbol: "£" },
    "Canada": { code: "+1", currency: "CAD", symbol: "$" },
    "Australia": { code: "+61", currency: "AUD", symbol: "$" },
    "United Arab Emirates": { code: "+971", currency: "AED", symbol: "AED" },
};

const COUNTRIES = Object.keys(COUNTRY_META_DATA);
const STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Delhi"
];
const KERALA_DISTRICTS = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam",
    "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram",
    "Thrissur", "Wayanad"
];

// --- Currencies for Selector ---
const CURRENCIES = Array.from(new Set(Object.values(COUNTRY_META_DATA).map(m => m.symbol)));

// --- Helper Functions ---
const sanitizePhone = (phone: string, countryCode: string): string => {
    let cleaned = phone.trim();
    if (countryCode && cleaned.startsWith(countryCode)) {
        cleaned = cleaned.substring(countryCode.length).trim();
    } else if (countryCode && cleaned.startsWith(countryCode.replace("+", ""))) {
        cleaned = cleaned.substring(countryCode.replace("+", "").length).trim();
    }
    return cleaned;
};

export default function GetStartedPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [menuFiles, setMenuFiles] = useState<File[]>([]);

    const [hotelDetails, setHotelDetails] = useState<HotelDetails>({
        name: "",
        phone: "",
        country: "India",
        state: "",
        district: "",
        facebook_link: "",
        instagram_link: "",
        location_link: "",
        currency: "₹",
    });
    const [isExtractingMenu, setIsExtractingMenu] = useState(false);
    const [extractedItems, setExtractedItems] = useState<MenuItem[]>([]);

    const extractionPromise = useRef<Promise<MenuItem[]> | null>(null);
    const [colorPalettes, setColorPalettes] = useState<ColorPalette[]>([]);
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>({
        text: "#000000",
        background: "#ffffff",
        accent: "#ea580c",
    });
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authCredentials, setAuthCredentials] = useState({ email: "", password: "123456", referralCode: "" });
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [signupResult, setSignupResult] = useState<any>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);



    // --- Persistence & Hydration ---

    // Hydrate from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // If we were on step 3 but have no items, it means extraction was incomplete/interrupted.
                // Reset to start.
                if (parsed.step === 3 && (!parsed.extractedItems || parsed.extractedItems.length === 0)) {
                    setStep(1);
                    // Don't restore other state to be safe, or maybe just restore details?
                    // Let's restore details but reset step.
                    if (parsed.hotelDetails) setHotelDetails(parsed.hotelDetails);
                } else {
                    if (parsed.step) setStep(parsed.step);
                    if (parsed.hotelDetails) setHotelDetails(parsed.hotelDetails);
                    if (parsed.extractedItems) setExtractedItems(parsed.extractedItems);
                    if (parsed.selectedPalette) setSelectedPalette(parsed.selectedPalette);
                    if (parsed.colorPalettes) setColorPalettes(parsed.colorPalettes);
                }
            } catch (e) {
                console.error("Failed to parse stored state", e);
            }
        }
    }, []);

    // Persist to localStorage
    useEffect(() => {
        const stateToSave = {
            step,
            hotelDetails,
            extractedItems,
            selectedPalette,
            colorPalettes
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [step, hotelDetails, extractedItems, selectedPalette, colorPalettes]);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (step !== 1) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const newFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1 || items[i].type === "application/pdf") {
                    const blob = items[i].getAsFile();
                    if (blob) newFiles.push(blob);
                }
            }

            if (newFiles.length > 0) {
                setMenuFiles(prev => [...prev, ...newFiles]);
                toast.success(`${newFiles.length} file(s) added!`);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [step]);

    // --- Handlers ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setMenuFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setMenuFiles(prev => prev.filter((_, i) => i !== index));
    };



    const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "country") {
            const meta = COUNTRY_META_DATA[value];
            setHotelDetails((prev) => ({
                ...prev,
                [name]: value,
                currency: meta ? meta.symbol : prev.currency, // Auto-select currency symbol
                state: "", // Clear state when country changes
                district: "" // Clear district when country changes
            }));
        } else if (name === "state") {
            setHotelDetails((prev) => ({
                ...prev,
                [name]: value,
                district: "" // Clear district when state changes
            }));
        } else {
            setHotelDetails((prev) => ({ ...prev, [name]: value }));
        }
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
        if (menuFiles.length === 0) throw new Error("No menu files provided");

        setIsExtractingMenu(true);
        setExtractionError(null);
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
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

            const prompt = `Extract each distinct dish as a separate item from the provided menu files (images or PDFs). 
      For each item, provide:
      - name: The name of the dish.
      - price: The minimum price.
      - description: A short, appetizing description (max 10 words).
      - category: The main heading.
      - variants: (Optional) Array of {name, price} for sizes.`;

            const fileParts = await Promise.all(menuFiles.map(async (file) => {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(",")[1]);
                    reader.readAsDataURL(file);
                });
                return {
                    inlineData: {
                        data: base64,
                        mimeType: file.type
                    }
                };
            }));

            const result = await model.generateContent([
                prompt,
                ...fileParts
            ]);

            const parsedMenu = JSON.parse(result.response.text());
            console.log("Extracted menu", parsedMenu);
            setExtractedItems(parsedMenu);

            // Trigger background image fetch for first 10 items
            fetchImagesInBackground(parsedMenu);

            return parsedMenu;
        } catch (error: any) {
            console.error("Extraction failed:", error);
            setExtractionError(error.message || "Failed to extract menu. Please try again.");
            toast.error("Failed to extract menu. Please try again.");
            throw error;
        } finally {
            setIsExtractingMenu(false);
        }
    };

    const handleRetryExtraction = async () => {
        setExtractionError(null);
        try {
            extractionPromise.current = extractMenu();
            await extractionPromise.current;
        } catch (e) {
            // Error already handled
        }
    };

    const handleCancelExtraction = () => {
        setExtractionError(null);
        setMenuFiles([]);
        setExtractedItems([]);
        setStep(1);
    };

    const handleStep1Next = () => {
        if (menuFiles.length === 0) return;

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

    const handleFinalPublish = async () => {
        if (!authCredentials.email) {
            toast.error("Please enter your email");
            return;
        }

        setIsPublishing(true);
        try {
            // Check email uniqueness
            const { checkEmailUnique } = await import("@/app/actions/checkEmail");
            const { isUnique } = await checkEmailUnique(authCredentials.email);

            if (!isUnique) {
                toast.error("This email is already registered. Please login or use a different email.");
                setIsPublishing(false);
                return;
            }

            const countryMeta = COUNTRY_META_DATA[hotelDetails.country] || { code: "+91", currency: "INR", symbol: "₹" };
            let bannerUrl = "";

            // Handle Banner Upload


            const finalPhone = sanitizePhone(hotelDetails.phone, countryMeta.code);

            const socialLinksData = {
                instagram: hotelDetails.instagram_link,
                facebook: hotelDetails.facebook_link,
                location: hotelDetails.location_link
            };

            // --- PLAN SELECTION ---
            // If country is India -> in_trial
            // Else -> int_free
            const isIndia = hotelDetails.country === "India";
            const planId = isIndia ? "in_trial" : "int_free";
            const planList = isIndia ? plansData.india : plansData.international;
            const selectedPlan = planList.find((p: any) => p.id === planId) || planList[0];

            // --- SUBSCRIPTION DETAILS ---
            const now = new Date();
            const periodDays = selectedPlan.id === "in_trial" ? 20 : (selectedPlan.period_days || 30);
            const expiryDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

            const subscriptionDetails = {
                plan: selectedPlan,
                status: "active",
                startDate: now.toISOString(),
                expiryDate: expiryDate.toISOString(),
                isFreePlanUsed: true,
                usage: {
                    scans_cycle: 0,
                    last_reset: now.toISOString(),
                }
            };

            // --- FEATURE FLAGS ---
            const defaultFlags = ["ordering-false"];
            const enabledMap = (selectedPlan as any).features_enabled || {};

            let finalFlags: string[] = [];

            if (selectedPlan.id === 'in_trial' || selectedPlan.id === 'in_ordering') {
                finalFlags = defaultFlags.map((flag: string) => {
                    const [key] = flag.split("-");
                    if (enabledMap[key]) return `${key}-true`;
                    return flag;
                });
            }


            // Construct Partner Data
            const partnerData = {
                role: "partner",
                name: hotelDetails.name,
                password: authCredentials.password || "123456", // Default password
                email: authCredentials.email,
                store_name: hotelDetails.name,
                phone: finalPhone,
                country: hotelDetails.country,
                location: hotelDetails.location_link || "",
                status: "active",
                upi_id: "",
                whatsapp_numbers: [],
                district: hotelDetails.district || "",
                state: hotelDetails.state || "",
                delivery_status: false,
                geo_location: { type: "Point", coordinates: [0, 0] },
                delivery_rate: 0,
                delivery_rules: { rules: [] },
                currency: hotelDetails.currency,
                country_code: countryMeta.code,
                social_links: JSON.stringify(socialLinksData),
                store_banner: bannerUrl || "",
                is_shop_open: true,
                theme: JSON.stringify({
                    colors: {
                        text: selectedPalette.text,
                        bg: selectedPalette.background,
                        accent: selectedPalette.accent
                    },
                    menuStyle: "compact"
                }),
                referral_code: authCredentials.referralCode,
                subscription_details: subscriptionDetails,
                feature_flags: finalFlags.join(",")
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
                        is_veg: item.is_veg,
                        image_url: item.image,
                        is_available: true,
                        category_id: `temp-cat-${uniqueCategories.indexOf(item.category)}`,
                        category: { name: item.category }, // Passed for onBoardUserSignup compatibility
                        variants: item.variants || []
                    };
                    return acc;
                }, {} as Record<string, any>),
                categories: categoriesData
            };

            const fullData = {
                partner: partnerData,
                categories: categoriesData,
                menu: { items: menuData.items }
            };

            // Call Signup Action
            const signupData = await onBoardUserSignup(fullData);

            // Clear local storage
            localStorage.removeItem("cravings_onboarding_state");
            localStorage.removeItem("onboarding_data");

            // 5. Trigger Background Image Generation if needed
            const itemsMissingImages = extractedItems.filter(item => !item.image);
            if (itemsMissingImages.length > 0) {
                // Fire and forget
                fetch(process.env.NEXT_PUBLIC_SERVER_URL + "/api/auto-gen-images", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        partnerId: signupData.partnerId,
                        items: itemsMissingImages.map(item => ({
                            name: item.name,
                            description: item.description,
                            category: item.category
                        })),
                        email: authCredentials.email
                    })
                }).catch(err => console.error("Failed to trigger background image gen", err));
            }

            // 6. Show Success UI
            setRegistrationSuccess(true);
            setSignupResult(signupData);
            setIsPublishing(false);
            window.scrollTo({ top: 0, behavior: "smooth" });

        } catch (error) {
            console.error("Signup finalization failed", error);
            toast.error("Failed to finalize signup. Please try again.");
            setIsPublishing(false);
        }
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

            <div className={`border-2 border-dashed rounded-3xl p-6 md:p-10 transition-colors relative group ${menuFiles.length > 0 ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-4">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${menuFiles.length > 0 ? "bg-green-100" : "bg-orange-100"}`}>
                        {menuFiles.length > 0 ? (
                            <Check className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                        ) : (
                            <Upload className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-gray-900 text-sm md:text-base">
                            {menuFiles.length > 0 ? `${menuFiles.length} File(s) Selected` : "Click to upload, drag & drop, or paste"}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500">
                            JPG, PNG, PDF up to 10MB
                        </p>
                        {menuFiles.length > 0 && (
                            <p className="text-xs text-green-600 font-medium">Click area to add more</p>
                        )}
                    </div>
                </div>
            </div>

            {/* File Preview List */}
            {menuFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {menuFiles.map((file, idx) => (
                        <div key={idx} className="relative group/file aspect-square rounded-xl overflow-hidden border border-gray-200">
                            {file.type.startsWith('image/') ? (
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Page ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center p-2 text-center">
                                    <FileText className="w-8 h-8 text-red-500 mb-2" />
                                    <span className="text-xs text-red-700 w-full truncate px-2 font-medium">
                                        {file.name}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => removeFile(idx)}
                                className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg p-1.5 shadow-sm opacity-100 md:opacity-0 md:group-hover/file:opacity-100 transition-all scale-100 active:scale-95"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )
            }

            <Button
                onClick={handleStep1Next}
                disabled={menuFiles.length === 0}
                className="w-full h-10 md:h-11 text-base md:text-lg rounded-lg bg-orange-600 hover:bg-orange-700"
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
                    <Label htmlFor="name" className="text-sm">Restaurant Name <span className="text-red-500">*</span></Label>
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
                    <Label htmlFor="phone" className="text-sm">Number <span className="text-red-500">*</span></Label>
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

            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="facebook_link" className="text-sm">Facebook Link (Optional)</Label>
                    <Input
                        id="facebook_link"
                        name="facebook_link"
                        placeholder="https://facebook.com/..."
                        value={hotelDetails.facebook_link}
                        onChange={handleDetailsChange}
                        className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="instagram_link" className="text-sm">Instagram Link (Optional)</Label>
                    <Input
                        id="instagram_link"
                        name="instagram_link"
                        placeholder="https://instagram.com/..."
                        value={hotelDetails.instagram_link}
                        onChange={handleDetailsChange}
                        className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="location_link" className="text-sm">Google Maps Location Link (Optional)</Label>
                <Input
                    id="location_link"
                    name="location_link"
                    placeholder="https://maps.google.com/..."
                    value={hotelDetails.location_link}
                    onChange={handleDetailsChange}
                    className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                />
            </div>



            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="country" className="text-sm">Country <span className="text-red-500">*</span></Label>
                    <select
                        id="country"
                        name="country"
                        value={hotelDetails.country}
                        onChange={handleDetailsChange}
                        className="w-full h-10 md:h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="" disabled>Select Country</option>
                        {COUNTRIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm">State <span className="text-red-500">*</span></Label>
                    {hotelDetails.country === "India" ? (
                        <select
                            id="state"
                            name="state"
                            value={hotelDetails.state}
                            onChange={handleDetailsChange}
                            className="w-full h-10 md:h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="" disabled>Select State</option>
                            {STATES.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            id="state"
                            name="state"
                            placeholder="State / Province"
                            value={hotelDetails.state}
                            onChange={handleDetailsChange}
                            className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                        />
                    )}
                </div>

                {hotelDetails.state === "Kerala" && (
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="district" className="text-sm">District <span className="text-red-500">*</span></Label>
                        <select
                            id="district"
                            name="district"
                            value={hotelDetails.district}
                            onChange={handleDetailsChange}
                            className="w-full h-10 md:h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="" disabled>Select District</option>
                            {KERALA_DISTRICTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                )}
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



    const renderSuccessView = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md mx-auto md:mx-0">
            <div className="space-y-2 text-center md:text-left">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Your Menu is Live!
                </h1>
                <p className="text-gray-500">
                    Congratulations! Your digital menu has been created and is ready to share.
                </p>
            </div>

            <div className="space-y-4">
                <Button
                    className="w-full flex items-center justify-center gap-2 h-12 text-lg rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={() => {
                        const url = `https://www.cravings.live/qrScan/${hotelDetails.name.replace(/ /g, "-")}/${signupResult?.firstQrCodeId}`;
                        window.open(url, "_blank");
                    }}
                >
                    <ExternalLink size={20} />
                    View Menu
                </Button>

                <div className="grid grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl"
                        onClick={() => {
                            const url = `https://www.cravings.live/qrScan/${hotelDetails.name.replace(/ /g, "-")}/${signupResult?.firstQrCodeId}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Menu link copied to clipboard!");
                        }}
                    >
                        <Copy size={18} />
                        Share
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
                        onClick={async () => {
                            try {
                                // Auto-login logic
                                const { signInPartnerWithEmail } = useAuthStore.getState();
                                await signInPartnerWithEmail(authCredentials.email, "123456");
                                router.push("/admin-v2");
                            } catch (e) {
                                console.error("Auto-login failed", e);
                                toast.error("Redirecting to login...");
                                router.push("/login");
                            }
                        }}
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => {
        // Error State
        if (extractionError) {
            return (
                <div className="max-w-md mx-auto text-center space-y-8 animate-in fade-in duration-500 mt-12 bg-white p-8 rounded-3xl shadow-sm border border-red-100">
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Extraction Failed</h2>
                        <p className="text-gray-500">
                            {extractionError}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleRetryExtraction}
                            className="w-full h-11 text-base rounded-full bg-orange-600 hover:bg-orange-700"
                        >
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleCancelExtraction}
                            className="w-full h-11 text-base rounded-full"
                        >
                            Cancel & Upload Again
                        </Button>
                    </div>
                </div>
            );
        }

        // If still extracting, show loading state
        if (isExtractingMenu || extractedItems.length === 0) {
            return (
                <div className="max-w-md mx-auto text-center space-y-6 md:space-y-8 animate-in fade-in duration-500 min-h-[50vh] flex flex-col items-center justify-center">
                    <div className="space-y-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                            <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-orange-600 animate-spin" />
                        </div>
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">
                            Extracting Your Menu
                        </h1>
                        <p className="text-sm md:text-base text-gray-500">
                            Please wait while we process your menu image...
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start gap-8 animate-in fade-in duration-700 md:pt-12 pb-24 md:pb-0">
                <div className={`flex-1 space-y-6 ${registrationSuccess ? "hidden md:block" : "hidden md:block"}`}>
                    {registrationSuccess ? renderSuccessView() : (
                        <>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                    Your Menu is Ready!
                                </h1>
                                <p className="text-gray-500">
                                    We've extracted {extractedItems.length} items from your image.
                                    Here's how it looks. You can edit the items in the dashboard after publishing.
                                </p>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                                    <p className="text-xs text-blue-700">
                                        <strong>Note:</strong> You can edit the menu and menu-images in the dashboard after account creation.
                                        Images will be generated and updated in approx {Math.ceil((extractedItems.length * 2) / 60)} minutes.
                                        We will notify you via email once completed.
                                    </p>
                                </div>
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
                        </>
                    )}
                </div>

                <div className="flex-1 flex justify-center relative w-full overflow-hidden order-first md:order-none">
                    <CompactMenuPreview items={extractedItems} hotelDetails={hotelDetails} colorPalette={selectedPalette} currency={hotelDetails.currency} />
                </div>

                {/* Mobile Publish Button (Fixed Bottom) - Hide if success */}
                {!registrationSuccess && (
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
                        <div className="bg-blue-50/90 backdrop-blur-md border border-blue-100 p-3 rounded-xl shadow-lg">
                            <p className="text-xs text-blue-700 text-center">
                                Note: Images will be generated and updated to your menu in approx {Math.ceil((extractedItems.length * 2) / 60)} minutes.
                            </p>
                        </div>
                    </div>
                )}

                {/* Mobile Success Floating Card */}
                {registrationSuccess && (
                    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex flex-col gap-3 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-2xl border border-white/50 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Check className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Menu is Live!</h3>
                                    <p className="text-xs text-gray-500">Ready to share with customers</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    className="w-full h-11 text-sm rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
                                    onClick={() => {
                                        const url = `https://www.cravings.live/qrScan/${hotelDetails.name.replace(/ /g, "-")}/${signupResult?.firstQrCodeId}`;
                                        window.open(url, "_blank");
                                    }}
                                >
                                    <ExternalLink size={16} className="mr-2" />
                                    View
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 text-sm rounded-xl bg-white"
                                    onClick={() => {
                                        const url = `https://www.cravings.live/qrScan/${hotelDetails.name.replace(/ /g, "-")}/${signupResult?.firstQrCodeId}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success("Link copied!");
                                    }}
                                >
                                    <Share2 size={16} className="mr-2" />
                                    Share
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                className="w-full h-10 text-sm rounded-xl text-gray-600 hover:bg-gray-100"
                                onClick={async () => {
                                    try {
                                        const { signInPartnerWithEmail } = useAuthStore.getState();
                                        const partner = await signInPartnerWithEmail(authCredentials.email, "123456");
                                        if (partner && partner.subscription_details) {
                                            router.push("/admin-v2");
                                        } else {
                                            router.push("/admin");
                                        }
                                    } catch (e) {
                                        console.error("Auto-login failed", e);
                                        router.push("/login");
                                    }
                                }}
                            >
                                <LayoutDashboard size={16} className="mr-2" />
                                Go to Dashboard
                            </Button>
                            <div className="bg-blue-50/90 backdrop-blur-md border border-blue-100 p-3 rounded-xl shadow-lg">
                                <p className="text-xs text-blue-700 text-center">
                                    Note: Images will be generated and updated to your menu in approx {Math.ceil((extractedItems.length * 2) / 60)} minutes.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <FullScreenLoader
                isLoading={isPublishing}
                loadingTexts={[
                    "Creating your account...",
                    "Setting up your digital menu...",
                    "Configuring dashboard...",
                    "Almost there..."
                ]}
            />
            {/* Header Steps */}
            <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {step > 1 && (
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
                    {/* Step Indicator */}
                    <div className="text-sm font-medium text-gray-500">
                        Step {step} of 3
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={`max-w-6xl mx-auto ${step === 3 ? "px-0 py-0 md:px-6" : step === 2 ? "px-6 py-6 sm:py-8" : "px-6 py-12"}`}>


                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </main>

            {/* Final Success View - NOW INTEGRATED IN renderStep3 */}

            {!registrationSuccess && (
                <>
                    {/* Auth Modal */}

                    {showAuthModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                                <div className="space-y-2 text-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Enter your email to create menu</h2>
                                    <p className="text-sm text-gray-500">We need this to send you the login details for your menu dashboard.</p>
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
                </>
            )}
        </div>
    );
}
