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
    Eye,
    EyeOff,
    Copy,
    ExternalLink,
    LayoutDashboard,
    Share2,
    Palette,
    Plus,
    Sparkles,
    Mail,
    RefreshCw
} from "lucide-react";
import { GoogleGenerativeAI, Schema } from "@google/generative-ai";
import { toast } from "sonner";
import { CompactMenuPreview, ColorPalette } from "@/components/get-started/CompactMenuPreview";
import { useRouter } from "next/navigation";
import axios from "axios";
import { onBoardUserSignup } from "@/app/actions/onBoardUserSignup";
import plansData from "@/data/plans.json";
import { useAuthStore } from "@/store/authStore";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { countryCodes } from "@/utils/countryCodes";
import Chatwoot from "@/components/Chatwoot";

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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

const SAMPLE_MENU_ITEMS: MenuItem[] = [
    {
        "name": "Soda",
        "price": 2.25,
        "description": "Chilled carbonated beverages in various popular flavors.",
        "category": "beverages"
    },
    {
        "name": "Bottled Mineral Water",
        "price": 2.25,
        "description": "Crisp and refreshing natural mineral water.",
        "category": "beverages"
    },
    {
        "name": "Milk",
        "price": 2.25,
        "description": "Cold and nutritious milk, a classic beverage choice.",
        "category": "beverages"
    },
    {
        "name": "Fresh Juice",
        "price": 3.25,
        "description": "Refreshing, freshly squeezed fruit juices for a vibrant start.",
        "category": "beverages"
    },
    {
        "name": "Tea",
        "price": 1.75,
        "description": "Warm and soothing classic tea selection.",
        "category": "beverages"
    },
    {
        "name": "Organic Sirloin Burger",
        "price": 9.5,
        "description": "Premium organic sirloin beef for the ultimate burger experience.",
        "category": "burgers"
    },
    {
        "name": "Mushroom Swiss Burger",
        "price": 10.25,
        "description": "Sautéed mushrooms and melted Swiss cheese on a burger.",
        "category": "burgers"
    },
    {
        "name": "Bison Burger",
        "price": 10.25,
        "description": "Juicy bison patty served with fresh toppings and bun.",
        "category": "burgers"
    },
    {
        "name": "Vegetarian Burger",
        "price": 9.0,
        "description": "Hearty plant-based patty served with all the fixings.",
        "category": "burgers"
    },
    {
        "name": "Chicken Burger",
        "price": 8.75,
        "description": "Grilled chicken breast with crisp lettuce and savory sauce.",
        "category": "burgers"
    },
    {
        "name": "Cheesecake with Berries",
        "price": 5.25,
        "description": "Creamy cheesecake topped with a seasonal berry compote.",
        "category": "dessert"
    },
    {
        "name": "Creme Brulee",
        "price": 5.5,
        "description": "Rich custard base topped with a layer of hardened caramel.",
        "category": "dessert"
    },
    {
        "name": "Blackberry Cobbler",
        "price": 4.75,
        "description": "Warm blackberries topped with a buttery, crumbly crust.",
        "category": "dessert"
    },
    {
        "name": "Red Velvet Cake",
        "price": 4.25,
        "description": "Moist cocoa-flavored cake with smooth cream cheese frosting.",
        "category": "dessert"
    },
    {
        "name": "Tiramisu",
        "price": 5.75,
        "description": "Classic Italian dessert with coffee-soaked ladyfingers and mascarpone.",
        "category": "dessert"
    },
    {
        "name": "Roasted Tofu Pocket",
        "price": 7.25,
        "description": "Savory roasted tofu stuffed with a flavorful vegetable medley.",
        "category": "entrées"
    },
    {
        "name": "Roasted Turkey Club",
        "price": 9.75,
        "description": "Triple-decker sandwich with turkey, bacon, and fresh greens.",
        "category": "entrées"
    },
    {
        "name": "Brew Battered Halibut",
        "price": 13.75,
        "description": "Crispy golden halibut served with tartar sauce and lemon.",
        "category": "entrées"
    },
    {
        "name": "Braised Short Ribs",
        "price": 16.75,
        "description": "Slow-cooked short ribs in a rich, savory reduction.",
        "category": "entrées"
    },
    {
        "name": "Pork Tenderloin",
        "price": 15.75,
        "description": "Roasted pork tenderloin seasoned with a blend of herbs.",
        "category": "entrées"
    },
    {
        "name": "Chicken Florentine Pizza",
        "price": 10.75,
        "description": "Tender chicken and fresh spinach on a cheesy base.",
        "category": "pizza",
        "variants": [
            { "name": "Personal", "price": 10.75 },
            { "name": "Share", "price": 16.75 }
        ]
    },
    {
        "name": "The Greek Pizza",
        "price": 10.75,
        "description": "Mediterranean flavors with olives, feta, and fresh herbs.",
        "category": "pizza",
        "variants": [
            { "name": "Personal", "price": 10.75 },
            { "name": "Share", "price": 14.75 }
        ]
    },
    {
        "name": "Margherita Pizza",
        "price": 9.5,
        "description": "Classic combination of fresh mozzarella, basil, and tomato.",
        "category": "pizza",
        "variants": [
            { "name": "Personal", "price": 9.5 },
            { "name": "Share", "price": 14.75 }
        ]
    },
    {
        "name": "Tomato Pesto Pizza",
        "price": 10.25,
        "description": "Fresh tomato slices and aromatic pesto on a thin crust.",
        "category": "pizza",
        "variants": [
            { "name": "Personal", "price": 10.25 },
            { "name": "Share", "price": 14.75 }
        ]
    },
    {
        "name": "Pesto Eggplant Pizza",
        "price": 9.5,
        "description": "Savory roasted eggplant paired with zesty pesto sauce.",
        "category": "pizza",
        "variants": [
            { "name": "Personal", "price": 9.5 },
            { "name": "Share", "price": 14.75 }
        ]
    }
];

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

// Helper to check darkness for contrast
const isColorDark = (hex: string) => {
    const c = hex.substring(1);      // strip #
    const rgb = parseInt(c, 16);   // convert rrggbb to decimal
    const r = (rgb >> 16) & 0xff;  // extract red
    const g = (rgb >> 8) & 0xff;  // extract green
    const b = (rgb >> 0) & 0xff;  // extract blue
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    return luma < 128;
};

const CustomColorPicker = ({ label, color, onChange }: { label: string, color: string, onChange: (c: string) => void }) => (
    <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</span>
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="w-full h-10 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between px-3 hover:border-orange-300 transition-colors"
                    style={{ backgroundColor: color }}
                >
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-md ${isColorDark(color) ? 'text-white' : 'text-black'}`}>
                        {color}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" side="top">
                <HexColorPicker
                    color={color}
                    onChange={onChange}
                />
            </PopoverContent>
        </Popover>
    </div>
);

import Image from "next/image";
export default function GetStartedClient({ appName = "Cravings", logo, defaultCountry = "" }: { appName?: string; logo?: string; defaultCountry?: string }) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [menuFiles, setMenuFiles] = useState<File[]>([]);

    // Determine default currency based on country
    const getDefaultCurrency = (country: string) => {
        if (!country) return "";
        const meta = COUNTRY_META_DATA[country];
        return meta?.symbol || "";
    };

    const [hotelDetails, setHotelDetails] = useState<HotelDetails>({
        name: "",
        phone: "",
        country: defaultCountry,
        state: "",
        district: "",
        facebook_link: "",
        instagram_link: "",
        location_link: "",
        currency: getDefaultCurrency(defaultCountry),
    });
    const [isExtractingMenu, setIsExtractingMenu] = useState(false);
    const [extractedItems, setExtractedItems] = useState<MenuItem[]>([]);

    const extractionPromise = useRef<Promise<MenuItem[]> | null>(null);

    // Presets
    const PRESETS: ColorPalette[] = [
        { text: "#000000", background: "#ffffff", accent: "#ea580c" }, // Classic Orange
        { text: "#ffffff", background: "#0f172a", accent: "#fbbf24" }, // Midnight Gold
        { text: "#14532d", background: "#f0fdf4", accent: "#16a34a" }, // Fresh Green
    ];

    const [colorPalettes, setColorPalettes] = useState<ColorPalette[]>(PRESETS);
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(PRESETS[0]);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [mobileTab, setMobileTab] = useState<'background' | 'text' | 'accent'>('accent');

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authCredentials, setAuthCredentials] = useState({ email: "", password: "123456", referralCode: "" });
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [signupResult, setSignupResult] = useState<any>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const [showEmailChangeForm, setShowEmailChangeForm] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);



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
            const isIndia = value === "India";
            setHotelDetails((prev) => ({
                ...prev,
                [name]: value,
                currency: isIndia ? "₹" : "$", // Auto-select currency symbol
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
        const MAX_ITEMS = 10;
        // Limit to first 10 items
        const itemsToProcess = items.slice(0, MAX_ITEMS);

        for (const item of itemsToProcess) {
            // slightly redundant if we trust extraction, but good practice
            if (item.image) continue;

            try {
                const response = await axios.post(
                    "https://images.cravings.live/api/images/search-google",
                    {
                        itemName: item.name?.includes(item.category) ? item.name : item.name + " " + item.category
                    },
                    { headers: { "Content-Type": "application/json" } }
                );

                // Correctly parse the response structure
                // Response example: { success: true, data: { itemId: "...", itemName: "...", imageUrl: "...", ... } }
                const imageUrl = response.data?.data?.imageUrl;

                if (imageUrl) {
                    setExtractedItems(currentItems => {
                        return currentItems.map(currentItem => {
                            if (currentItem.name === item.name) {
                                return { ...currentItem, image: imageUrl };
                            }
                            return currentItem;
                        });
                    });
                }
            } catch (error) {
                console.error(`Failed to fetch image for ${item.name}:`, error);
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
            const items = await extractionPromise.current;
            if (items && items.length > 0) {
                fetchImagesInBackground(items);
            }
        } catch (e) {
            // Error already handled
        }
    };

    const handleStartWithSampleData = () => {
        setExtractedItems(SAMPLE_MENU_ITEMS);
        extractionPromise.current = Promise.resolve(SAMPLE_MENU_ITEMS);

        setStep(2);
        toast.success("Loaded sample menu data!");
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
        if (!hotelDetails.name || !hotelDetails.phone || !authCredentials.email) {
            toast.error("Please fill in all details");
            return;
        }

        // Move to step 3 immediately without waiting
        setStep(3);

        // Wait for extraction in the background
        try {
            let items: MenuItem[] = [];
            if (extractionPromise.current) {
                items = await extractionPromise.current;
            } else {
                items = await extractMenu();
            }

            // Trigger background image fetch now that we have the email
            if (items && items.length > 0) {
                fetchImagesInBackground(items);
            }
        } catch (error) {
            // Error is already handled in extractMenu toast
        }
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

            const countryEntry = countryCodes.find(c => c.country === hotelDetails.country);
            const countryCode = countryEntry ? countryEntry.code : "+91";
            let bannerUrl = "";

            // Handle Banner Upload


            const finalPhone = sanitizePhone(hotelDetails.phone, countryCode);

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
            const periodDays = selectedPlan.period_days || 30;
            const expiryDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

            const subscriptionDetails = {
                plan: selectedPlan,
                status: "active",
                startDate: now.toISOString(),
                expiryDate: expiryDate.toISOString(),
                isFreePlanUsed: true,
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
                country_code: countryCode,
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
            // 5. Trigger Background Image Generation if needed
            // Commented out to enforce 10-image limit for now
            /*
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
            */

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
                        <div key={idx} className={`relative group/file aspect-square rounded-xl overflow-hidden border ${file.size > MAX_FILE_SIZE ? 'border-red-500' : 'border-gray-200'}`}>
                            {file.size > MAX_FILE_SIZE && (
                                <div className="absolute top-0 left-0 right-0 z-20 bg-red-500/90 text-white text-[10px] py-1 px-2 text-center font-medium">
                                    Too large ({Math.round(file.size / (1024 * 1024))}MB)
                                </div>
                            )}
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
                                className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg p-1.5 shadow-sm opacity-100 md:opacity-0 md:group-hover/file:opacity-100 transition-all scale-100 active:scale-95 z-30"
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
                disabled={menuFiles.length === 0 || menuFiles.some(f => f.size > MAX_FILE_SIZE)}
                className="w-full h-10 md:h-11 text-base md:text-lg rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {menuFiles.some(f => f.size > MAX_FILE_SIZE) ? "Remove invalid files to continue" : "Next Step"} <ChevronRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
            </Button>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
            </div>

            <Button
                variant="outline"
                onClick={handleStartWithSampleData}
                className="w-full h-12 md:h-14 text-base md:text-lg rounded-xl border-2 border-dashed border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 bg-white/50 transition-all group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-100/0 via-orange-100/30 to-orange-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Sparkles className="w-5 h-5 mr-2 text-orange-500 group-hover:text-orange-600 transition-colors" />
                <span>Try with Sample Menu</span>
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
                    <Label htmlFor="phone" className="text-sm">Phone Number<span className="text-red-500">*</span></Label>
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
                    <Label htmlFor="email" className="text-sm">Email <span className="text-red-500">*</span></Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={authCredentials.email}
                        onChange={(e) => setAuthCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="h-10 md:h-11 rounded-xl text-sm md:text-base"
                    />
                    <p className="text-xs text-gray-500">We'll send your dashboard login details here.</p>
                </div>

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
                        {countryCodes.map(c => (
                            <option key={c.country} value={c.country}>{c.country}</option>
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
                disabled={!hotelDetails.name || !hotelDetails.phone || !hotelDetails.country}
                className="w-full h-10 md:h-11 text-base md:text-lg rounded-full bg-orange-600 hover:bg-orange-700"
            >
                Create Menu <ChevronRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
            </Button>
        </div>
    );



    const handleEmailChange = async () => {
        if (!newEmail || !newEmail.includes("@")) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsUpdatingEmail(true);
        try {
            const { updateEmailAndResend } = await import("@/app/actions/updateEmailAndResend");
            await updateEmailAndResend({
                partnerId: signupResult?.partnerId,
                newEmail: newEmail
            });

            setAuthCredentials(prev => ({ ...prev, email: newEmail }));
            setShowEmailChangeForm(false);
            toast.success("Email updated! Check your new inbox.");
        } catch (error) {
            console.error("Failed to update email:", error);
            toast.error("Failed to update email. Please try again.");
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const renderEmailChangeForm = () => {
        if (!showEmailChangeForm) return null;

        return (
            <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button
                        onClick={() => setShowEmailChangeForm(false)}
                        className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8 text-orange-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Change Email</h1>
                        <p className="text-gray-500">
                            Enter your correct email address. We'll send your menu link and dashboard credentials there.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newEmail">New Email Address</Label>
                            <Input
                                id="newEmail"
                                type="email"
                                placeholder="you@example.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="h-12 rounded-xl text-base"
                                autoFocus
                            />
                        </div>

                        <Button
                            onClick={handleEmailChange}
                            disabled={isUpdatingEmail || !newEmail}
                            className="w-full h-12 text-lg rounded-xl bg-orange-600 hover:bg-orange-700"
                        >
                            {isUpdatingEmail ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5 mr-2" />
                                    Update & Resend
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSuccessView = () => {
        // Main success view
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md mx-auto md:mx-0">
                <div className="space-y-4 text-center md:text-left">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4">
                        <Mail className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Check Your Email!
                    </h1>
                    <p className="text-gray-600 text-lg">
                        We've sent your menu link and dashboard login credentials to:
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <p className="text-xl font-semibold text-gray-900 break-all">
                            {authCredentials.email}
                        </p>
                    </div>
                    <p className="text-gray-500 text-sm">
                        Can't find it? Check your spam folder or update your email below.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => {
                        setNewEmail("");
                        setShowEmailChangeForm(true);
                    }}
                    className="w-full h-12 text-base rounded-xl border-2 border-dashed border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                    Wrong email? Change it
                </Button>

                <Button
                    onClick={() => router.push('/login')}
                    className="w-full h-12 text-base rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
                >
                    Login to Dashboard
                </Button>
            </div>
        );
    };

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
                <div className={`flex-1 space-y-6 ${registrationSuccess ? "hidden md:block" : ""}`}>
                    {registrationSuccess ? renderSuccessView() : (
                        <>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                    Your Menu is Ready!
                                </h1>
                                <p className="text-gray-500">
                                    We've extracted {extractedItems.length} items.
                                    Customize your theme below.
                                </p>
                            </div>

                            <div className="hidden md:block space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-700">Choose a Theme</h3>
                                    <div className="grid grid-cols-4 gap-3">
                                        {PRESETS.map((palette, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedPalette(palette);
                                                    setIsCustomMode(false);
                                                }}
                                                className={`h-16 rounded-xl border-2 flex items-center justify-center relative overflow-hidden transition-all ${!isCustomMode && selectedPalette.background === palette.background && selectedPalette.accent === palette.accent ? "border-orange-600 ring-2 ring-orange-100" : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                                style={{ backgroundColor: palette.background }}
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xs font-bold" style={{ color: palette.text }}>Aa</span>
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.accent }} />
                                                </div>
                                            </button>
                                        ))}

                                        {/* Custom Rainbow Button */}
                                        <button
                                            onClick={() => setIsCustomMode(true)}
                                            className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 relative overflow-hidden transition-all ${isCustomMode ? "border-orange-600 ring-2 ring-orange-100" : "border-gray-200 hover:border-gray-300"
                                                } bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100`}
                                        >
                                            <Palette size={20} className="text-gray-700" />
                                            <span className="text-[10px] font-bold text-gray-600">Custom</span>
                                        </button>
                                    </div>

                                    {/* Custom Color Editor (slide down) */}
                                    {isCustomMode && (
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-3 gap-3">
                                                <CustomColorPicker
                                                    label="Background"
                                                    color={selectedPalette.background}
                                                    onChange={(c) => setSelectedPalette(p => ({ ...p, background: c }))}
                                                />
                                                <CustomColorPicker
                                                    label="Text"
                                                    color={selectedPalette.text}
                                                    onChange={(c) => setSelectedPalette(p => ({ ...p, text: c }))}
                                                />
                                                <CustomColorPicker
                                                    label="Accent"
                                                    color={selectedPalette.accent}
                                                    onChange={(c) => setSelectedPalette(p => ({ ...p, accent: c }))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleFinalPublish}
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

                {/* Mobile Floating Bar */}
                {!registrationSuccess && (
                    <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 flex flex-col gap-3">
                        {!isCustomMode ? (
                            <div className="bg-white/80 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-white/50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
                                    {PRESETS.map((palette, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedPalette(palette);
                                                setIsCustomMode(false);
                                            }}
                                            className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${selectedPalette.background === palette.background && selectedPalette.accent === palette.accent ? "border-orange-600 scale-110 ring-2 ring-orange-100" : "border-white/50"
                                                }`}
                                            style={{ backgroundColor: palette.background }}
                                        >
                                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: palette.accent }} />
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setIsCustomMode(true)}
                                        className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${isCustomMode ? "border-orange-600 scale-110 ring-2 ring-orange-100" : "border-gray-200"
                                            } bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100`}
                                    >
                                        <Palette size={18} className="text-gray-700" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10 fade-in duration-300 space-y-4">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setIsCustomMode(false)}
                                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        {(['background', 'text', 'accent'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setMobileTab(tab)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${mobileTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="w-8" /> {/* Spacer */}
                                </div>

                                <div className="flex justify-center pb-2">
                                    <HexColorPicker
                                        color={selectedPalette[mobileTab]}
                                        onChange={(c) => setSelectedPalette(prev => ({ ...prev, [mobileTab]: c }))}
                                        style={{ width: '100%', height: '160px' }}
                                    />
                                </div>
                            </div>
                        )}

                        {!isCustomMode && (
                            <Button
                                onClick={handleFinalPublish}
                                className="w-full h-12 text-base rounded-full bg-green-600 hover:bg-green-700 shadow-xl"
                            >
                                Publish Live <ChevronRight className="ml-2 w-5 h-5" />
                            </Button>
                        )}
                    </div>
                )}

                {/* Mobile Success Floating Card */}
                {registrationSuccess && (
                    <div className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex flex-col gap-3 animate-in slide-in-from-bottom-10 duration-700">
                        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-2xl border border-white/50 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">Check Your Email!</h3>
                                    <p className="text-xs text-gray-500 break-all">{authCredentials.email}</p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 text-center">
                                We've sent your menu link and dashboard credentials to your email.
                            </p>

                            <Button
                                variant="outline"
                                className="w-full h-11 text-sm rounded-xl border-2 border-dashed border-orange-300 text-orange-700 hover:bg-orange-50"
                                onClick={() => {
                                    setNewEmail("");
                                    setShowEmailChangeForm(true);
                                }}
                            >
                                Wrong email? Change it
                            </Button>

                            <Button
                                onClick={() => router.push('/login')}
                                className="w-full h-11 text-sm rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
                            >
                                Login to Dashboard
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
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
                            {logo ? (
                                <div className="flex items-center gap-2">
                                    <Image
                                        src={logo}
                                        alt={appName}
                                        width={120}
                                        height={40}
                                        className="h-8 w-auto object-contain"
                                        priority
                                    />
                                    <span className="text-xl font-bold text-gray-900">{appName}</span>
                                </div>
                            ) : (
                                <>
                                    <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                                    <span className="text-xl font-bold text-gray-900">{appName}</span>
                                </>
                            )}
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

            {/* Email Change Fullscreen Form */}
            {renderEmailChangeForm()}

            {/* Chatwoot Chat Bubble */}
            <Chatwoot />
        </div>
    );
}
