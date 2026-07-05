"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Upload, Database, Search, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Img from "../Img";
import axios from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageGridModalV2Props {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    itemName: string;
    category: string;
    currentImage: string;
    onSelectImage: (url: string) => void;
}

type TabKey = "menuthere" | "google" | "upload";

export function ImageGridModalV2({
    isOpen,
    onOpenChange,
    itemName,
    category,
    currentImage,
    onSelectImage,
}: ImageGridModalV2Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [menuthereImages, setMenuthereImages] = useState<string[]>([]);
    const [googleImages, setGoogleImages] = useState<string[]>([]);
    const [loadingTab, setLoadingTab] = useState<null | "menuthere" | "google">(null);
    const [activeTab, setActiveTab] = useState<TabKey>("menuthere");
    const [canPaste, setCanPaste] = useState(false);

    useEffect(() => {
        // Check if the browser supports the clipboard read API before showing the button.
        setCanPaste(!!(navigator.clipboard && navigator.clipboard.read));
    }, []);

    // Fetch curated images from the Menuthere Image DB (imagedb.menuthere.com via proxy).
    const fetchMenuthereImages = useCallback(async (query: string) => {
        setLoadingTab("menuthere");
        try {
            const bank = await axios.get("/api/image-bank", {
                params: { item: query, limit: 30 },
            });
            const urls = (bank.data?.images || [])
                .map((i: { image_url?: string }) => i.image_url)
                .filter(Boolean) as string[];
            setMenuthereImages(Array.from(new Set(urls)));
        } catch (err) {
            console.error("Menuthere DB fetch failed", err);
            toast.error("Failed to fetch from Menuthere DB.");
            setMenuthereImages([]);
        } finally {
            setLoadingTab(null);
        }
    }, []);

    // Fetch from the Google image search API (same source used by "Get all images").
    const fetchGoogleImages = useCallback(async (query: string) => {
        setLoadingTab("google");
        try {
            const res = await axios.post(
                "https://images.cravings.live/api/images/search-google",
                { itemName: query },
                { headers: { "Content-Type": "application/json" } }
            );
            const url = res.data?.data?.imageUrl;
            setGoogleImages(url ? [url] : []);
        } catch (err) {
            console.error("Google Images fetch failed", err);
            toast.error("Failed to fetch Google images.");
            setGoogleImages([]);
        } finally {
            setLoadingTab(null);
        }
    }, []);

    // On open: reset to the Menuthere DB tab and load it.
    useEffect(() => {
        if (isOpen) {
            const defaultTerm = itemName ? itemName.trim() : category.trim();
            setSearchQuery(defaultTerm);
            setActiveTab("menuthere");
            setGoogleImages([]);
            fetchMenuthereImages(defaultTerm);
        }
    }, [isOpen, itemName, category, fetchMenuthereImages]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === "google") fetchGoogleImages(searchQuery);
        else fetchMenuthereImages(searchQuery);
    };

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        // Lazy-load a source the first time its tab is opened.
        if (tab === "google" && googleImages.length === 0 && loadingTab !== "google") {
            fetchGoogleImages(searchQuery);
        }
        if (tab === "menuthere" && menuthereImages.length === 0 && loadingTab !== "menuthere") {
            fetchMenuthereImages(searchQuery);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        onSelectImage(blobUrl);
    };

    const handlePaste = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith("image/")) {
                        const blob = await item.getType(type);
                        const blobUrl = URL.createObjectURL(blob);
                        onSelectImage(blobUrl);
                        toast.success("Image pasted from clipboard");
                        return;
                    }
                }
            }
            toast.error("No image found in clipboard");
        } catch (error) {
            console.error("Paste error:", error);
            toast.error("Failed to paste image");
        }
    };

    const isSearchTab = activeTab === "menuthere" || activeTab === "google";
    const activeImages = activeTab === "google" ? googleImages : menuthereImages;
    const isLoading = loadingTab === activeTab;
    const emptyHint =
        activeTab === "google"
            ? "No Google results. Try a different search."
            : "Not in the Menuthere DB yet. Try a different search or the Google Images tab.";

    const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
        { key: "menuthere", label: "Menuthere DB", icon: <Database className="w-4 h-4 mr-2" /> },
        { key: "google", label: "Google Images", icon: <Sparkles className="w-4 h-4 mr-2" /> },
        { key: "upload", label: "Upload", icon: <Upload className="w-4 h-4 mr-2" /> },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] md:max-w-7xl sm:h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background transform-gpu">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold">Media Library</DialogTitle>
                    <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => onOpenChange(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Tabs */}
                    <div className="w-52 border-r bg-muted/30 hidden sm:flex flex-col p-2 gap-1">
                        {TABS.map((t) => (
                            <Button
                                key={t.key}
                                variant={activeTab === t.key ? "secondary" : "ghost"}
                                className="justify-start"
                                onClick={() => switchTab(t.key)}
                            >
                                {t.icon}
                                {t.label}
                            </Button>
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Mobile Tabs */}
                        <div className="sm:hidden border-b overflow-x-auto">
                            <div className="flex p-2 gap-2">
                                {TABS.map((t) => (
                                    <Button
                                        key={t.key}
                                        size="sm"
                                        variant={activeTab === t.key ? "secondary" : "ghost"}
                                        onClick={() => switchTab(t.key)}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {isSearchTab && (
                                <div className="h-full flex flex-col">
                                    <div className="p-4 border-b flex gap-2">
                                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder={
                                                        activeTab === "google"
                                                            ? "Search Google images..."
                                                            : "Search Menuthere DB..."
                                                    }
                                                    className="pl-8"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <Button type="submit" disabled={isLoading}>
                                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                                            </Button>
                                        </form>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center h-40">
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : activeImages.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                {emptyHint}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {activeImages.map((url, idx) => (
                                                    <div
                                                        key={`${url}-${idx}`}
                                                        className={cn(
                                                            "group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                                            currentImage === url ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/25"
                                                        )}
                                                        onClick={() => onSelectImage(url)}
                                                    >
                                                        <Img
                                                            src={url}
                                                            alt="Menu item"
                                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                        />
                                                        {currentImage === url && (
                                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                                <div className="bg-primary text-primary-foreground rounded-full p-1">
                                                                    <Check className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className={cn("flex-1 overflow-hidden w-full h-full", activeTab !== "upload" && "hidden")}>
                                <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6">
                                    <div className="text-center space-y-2">
                                        <div className="bg-muted/50 p-4 rounded-full inline-flex">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold">Upload Image</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                            Choose a file from your device or paste from clipboard.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full max-w-xs">
                                        <div className="relative w-full">
                                            <input
                                                type="file"
                                                className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                            />
                                            <Button className="w-full">
                                                Choose File
                                            </Button>
                                        </div>
                                        {canPaste && (
                                            <Button variant="outline" className="w-full" onClick={handlePaste}>
                                                Paste from Clipboard
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
