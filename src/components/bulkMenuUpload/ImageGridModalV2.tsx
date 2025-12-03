"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Check, Upload, ClipboardPaste, Image as ImageIcon, Search, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIImageGenerateModal from "@/components/AIImageGenerateModal";
import { useMenuStore } from "@/store/menuStore_hasura";
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

export function ImageGridModalV2({
    isOpen,
    onOpenChange,
    itemName,
    category,
    currentImage,
    onSelectImage,
}: ImageGridModalV2Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [aiPrompt, setAiPrompt] = useState("");
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [activeTab, setActiveTab] = useState("gallery");
    const { fetchCategorieImages } = useMenuStore();

    // Initialize search terms
    useEffect(() => {
        if (isOpen) {
            const defaultTerm = itemName ? itemName.trim() : category.trim();
            setSearchQuery(defaultTerm);
            setAiPrompt(defaultTerm);
            fetchGalleryImages(defaultTerm);
        }
    }, [isOpen, itemName, category]);

    const fetchGalleryImages = async (query: string) => {
        setIsLoading(true);
        try {
            const images: string[] = [];

            // 1. Fetch from Internal Store (Category based)
            // We try to fetch using the query as a "category" or just use the passed category if query is empty
            // Since fetchCategorieImages expects a category string, we'll try our best.
            try {
                const internalMenus = await fetchCategorieImages(query);
                if (internalMenus) {
                    images.push(...internalMenus.map((m) => m.image_url).filter(Boolean));
                }
            } catch (err) {
                console.warn("Internal fetch failed", err);
            }

            // 2. Fetch from Swiggy API (Web Search)
            try {
                const lat = "28.6139";
                const lng = "77.2090";
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/swiggy/images`,
                    { params: { lat, lng, query: query } }
                );
                if (response.data && Array.isArray(response.data)) {
                    images.push(...response.data);
                }
            } catch (err) {
                console.warn("Swiggy fetch failed", err);
            }

            // Deduplicate
            const uniqueImages = Array.from(new Set(images));
            setGalleryImages(uniqueImages);
        } catch (error) {
            console.error("Error fetching gallery images:", error);
            toast.error("Failed to fetch images.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGallerySearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchGalleryImages(searchQuery);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        setGalleryImages(prev => [blobUrl, ...prev]);
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
                        setGalleryImages(prev => [blobUrl, ...prev]);
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

    const handlePollinationsGenerate = async () => {
        if (!aiPrompt) {
            toast.error("Please enter a prompt");
            return;
        }

        setIsGeneratingAi(true);
        try {
            // Generate 4 variations using random seeds
            const newImages = Array.from({ length: 4 }).map(() => {
                const seed = Math.floor(Math.random() * 10000);
                const encodedPrompt = encodeURIComponent(aiPrompt);
                return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=512&height=512&seed=${seed}`;
            });

            setGeneratedImages(prev => [...newImages, ...prev]);
            toast.success("Images generated!");
        } catch (error) {
            console.error("AI Generation error:", error);
            toast.error("Failed to generate images");
        } finally {
            setIsGeneratingAi(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] md:max-w-7xl h-[100vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-xl font-semibold">Media Library</DialogTitle>
                    <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => onOpenChange(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Tabs */}
                    <div className="w-48 border-r bg-muted/30 hidden sm:flex flex-col p-2 gap-1">
                        <Button
                            variant={activeTab === "gallery" ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => setActiveTab("gallery")}
                        >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Gallery
                        </Button>
                        <Button
                            variant={activeTab === "upload" ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => setActiveTab("upload")}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                        </Button>
                        <Button
                            variant={activeTab === "ai" ? "secondary" : "ghost"}
                            className="justify-start"
                            onClick={() => setActiveTab("ai")}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Generate
                        </Button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Mobile Tabs */}
                        <div className="sm:hidden border-b overflow-x-auto">
                            <div className="flex p-2 gap-2">
                                <Button size="sm" variant={activeTab === "gallery" ? "secondary" : "ghost"} onClick={() => setActiveTab("gallery")}>Gallery</Button>
                                <Button size="sm" variant={activeTab === "upload" ? "secondary" : "ghost"} onClick={() => setActiveTab("upload")}>Upload</Button>
                                <Button size="sm" variant={activeTab === "ai" ? "secondary" : "ghost"} onClick={() => setActiveTab("ai")}>AI</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {activeTab === "gallery" && (
                                <div className="h-full flex flex-col">
                                    <div className="p-4 border-b flex gap-2">
                                        <form onSubmit={handleGallerySearch} className="flex-1 flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search images..."
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
                                    <div className="flex-1 overflow-y-auto p-4 max-h-[70vh]">
                                        {isLoading ? (
                                            <div className="flex items-center justify-center h-40">
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : galleryImages.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                No images found. Try a different search.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {galleryImages.map((url, idx) => (
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

                            {activeTab === "upload" && (
                                <div className="h-full flex flex-col items-center justify-center p-8 gap-6">
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
                                        <Button className="w-full relative">
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                            />
                                            Choose File
                                        </Button>
                                        <Button variant="outline" className="w-full" onClick={handlePaste}>
                                            <ClipboardPaste className="w-4 h-4 mr-2" />
                                            Paste from Clipboard
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === "ai" && (
                                <div className="h-full flex flex-col p-6 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-semibold">AI Generation</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Generate unique images using AI.
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="e.g. Delicious Butter Chicken"
                                            />
                                            <Button onClick={handlePollinationsGenerate} disabled={isGeneratingAi}>
                                                {isGeneratingAi ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                Generate
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 border rounded-lg bg-muted/10 p-4 text-muted-foreground text-sm relative overflow-y-auto max-h-[40vh]">
                                        {isGeneratingAi ? (
                                            <div className="flex flex-col items-center justify-center gap-4 z-10 h-full min-h-[200px]">
                                                <div className="relative">
                                                    <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse" />
                                                    <Sparkles className="w-12 h-12 text-primary animate-bounce relative z-10" />
                                                </div>
                                                <p className="text-lg font-medium animate-pulse text-foreground">Generating images...</p>
                                            </div>
                                        ) : generatedImages.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {generatedImages.map((url, idx) => (
                                                    <div
                                                        key={`ai-${idx}`}
                                                        className={cn(
                                                            "group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                                            currentImage === url ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/25"
                                                        )}
                                                        onClick={() => onSelectImage(url)}
                                                    >
                                                        <Img src={url} alt="AI Generated" className="w-full h-full object-cover" />
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
                                        ) : (
                                            <div className="flex items-center justify-center h-full min-h-[200px]">
                                                Generated images will appear here
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
