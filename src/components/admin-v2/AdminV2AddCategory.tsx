"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    X,
    Edit,
    Trash2,
    Plus,
    Loader2,
    ImagePlus,
    Sparkles,
    Upload,
} from "lucide-react";
import { useMenuStore } from "@/store/menuStore_hasura";
import { useAuthStore } from "@/store/authStore";
import { useCategoryStore } from "@/store/categoryStore_hasura";
import { ImageGridModalV2 } from "../bulkMenuUpload/ImageGridModalV2";
import { TAG_CATEGORIES, getTagColor } from "@/data/foodTags";
import { toast } from "sonner";
import Img from "../Img";
import axios from "axios";
import { GoogleGenerativeAI, Schema } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);
const MAX_RETRIES = 3;

interface AdminV2AddCategoryProps {
    onBack: () => void;
}

interface Variant {
    name: string;
    price: number;
}

interface LocalMenuItem {
    id: string;
    name: string;
    price: number;
    description: string;
    image_url: string;
    is_veg: boolean | undefined;
    variants: Variant[];
    tags: string[];
}

interface ExtractedItem {
    name: string;
    price: number;
    description: string;
    variants: Variant[];
    selected: boolean;
}

const emptyManualItem = {
    name: "",
    price: "",
    description: "",
    image_url: "",
    is_veg: undefined as boolean | undefined,
    tags: [] as string[],
};

export function AdminV2AddCategory({ onBack }: AdminV2AddCategoryProps) {
    const { addItem } = useMenuStore();
    const { userData } = useAuthStore();
    const { addCategory } = useCategoryStore();

    // Category state
    const [categoryName, setCategoryName] = useState("");
    const [items, setItems] = useState<LocalMenuItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0 });

    // Manual add item state
    const [isAddingItemManually, setIsAddingItemManually] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [manualItem, setManualItem] = useState(emptyManualItem);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [newVariant, setNewVariant] = useState<Variant>({ name: "", price: 0 });
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
    const [showVariantForm, setShowVariantForm] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

    // AI extraction state
    const [isAIMode, setIsAIMode] = useState(false);
    const [menuImageFiles, setMenuImageFiles] = useState<File[]>([]);
    const [menuImagePreviews, setMenuImagePreviews] = useState<string[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);

    // Get all images state
    const [isFetchingImages, setIsFetchingImages] = useState(false);
    const [imagesFetchedCount, setImagesFetchedCount] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync image previews with files
    useEffect(() => {
        const newPreviews = menuImageFiles.map(file => URL.createObjectURL(file));
        setMenuImagePreviews(newPreviews);
        return () => newPreviews.forEach(url => URL.revokeObjectURL(url));
    }, [menuImageFiles]);

    // ─── Variant Handlers ───
    const addVariantToForm = () => {
        if (!newVariant.name) {
            toast.error("Please fill the option name");
            return;
        }
        if (!newVariant.price && confirm("Price is zero. Do you want to proceed?") === false) {
            return;
        }
        if (editingVariantIndex !== null) {
            const updated = [...variants];
            updated[editingVariantIndex] = { ...newVariant };
            setVariants(updated);
            setEditingVariantIndex(null);
        } else {
            setVariants([...variants, { ...newVariant }]);
        }
        setNewVariant({ name: "", price: 0 });
        setShowVariantForm(false);
    };

    const startEditingVariant = (index: number) => {
        setEditingVariantIndex(index);
        setNewVariant({ ...variants[index] });
        setShowVariantForm(true);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const cancelVariantEdit = () => {
        setNewVariant({ name: "", price: 0 });
        setEditingVariantIndex(null);
        setShowVariantForm(false);
    };

    // ─── Manual Item Handlers ───
    const openManualForm = () => {
        setManualItem(emptyManualItem);
        setVariants([]);
        setEditingItemId(null);
        setIsAddingItemManually(true);
        setIsAIMode(false);
    };

    const openEditForm = (item: LocalMenuItem) => {
        setManualItem({
            name: item.name,
            price: item.price.toString(),
            description: item.description,
            image_url: item.image_url,
            is_veg: item.is_veg,
            tags: [...item.tags],
        });
        setVariants([...item.variants]);
        setEditingItemId(item.id);
        setIsAddingItemManually(true);
        setIsAIMode(false);
    };

    const handleManualItemSubmit = () => {
        if (!manualItem.name) {
            toast.error("Please enter an item name");
            return;
        }
        if (variants.length === 0 && (!manualItem.price || parseFloat(manualItem.price) <= 0)) {
            toast.error("Please set either a base price or add options");
            return;
        }

        const newItem: LocalMenuItem = {
            id: editingItemId || crypto.randomUUID(),
            name: manualItem.name,
            price: parseFloat(manualItem.price) || 0,
            description: manualItem.description,
            image_url: manualItem.image_url,
            is_veg: manualItem.is_veg,
            variants: [...variants],
            tags: [...manualItem.tags],
        };

        if (editingItemId) {
            setItems(prev => prev.map(item => item.id === editingItemId ? newItem : item));
            toast.success("Item updated");
        } else {
            setItems(prev => [...prev, newItem]);
            toast.success("Item added to list");
        }

        setManualItem(emptyManualItem);
        setVariants([]);
        setEditingItemId(null);
        setIsAddingItemManually(false);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // ─── AI Extraction Handlers ───
    const handleMenuImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setMenuImageFiles(Array.from(e.target.files));
        }
    };

    const handleExtractItems = async (retryCount = 0) => {
        if (menuImageFiles.length === 0) {
            toast.error("Please upload at least one image");
            return;
        }

        setIsExtracting(true);
        try {
            toast.loading(
                retryCount > 0
                    ? `Retrying extraction (attempt ${retryCount + 1}/${MAX_RETRIES})...`
                    : "Extracting menu items..."
            );

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
A 'variant' applies *only* to different sizes (e.g., Quarter, Half, Full, Small, Large, Regular) or quantities of the *same specific menu item*.
If a menu item does not have these explicit size/quantity options, it should *not* have a 'variants' field.
For example, 'Fresh Lime' and 'Mint Lime' are separate items, not variants of a general 'Lime Juice'.

For each item, provide:
- name: The name of the dish.
- price: The minimum price if variants exist, otherwise the item's price. Price must be a number, greater than zero. Use 1 if no price is found.
- description: A descriptive sentence for each item, maximum 10 words. Elaborate on the item's name and its category, highlighting key attributes like freshness, flavor, or main ingredients.
- category: The main heading under which the item is listed.
- variants: (Optional) An array of objects, each with 'name' and 'price', if the item has different sizes/portions. Variants must be arranged in ascending order of price. Variants should not contain item names or descriptions, only sizes/quantities. If no variants exist, this field should be omitted.`;

            const imageParts = await Promise.all(
                menuImageFiles.map(async (file) => {
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () =>
                            resolve((reader.result as string).split(",")[1]);
                        reader.readAsDataURL(file);
                    });
                    return { inlineData: { data: base64, mimeType: file.type } };
                })
            );

            const result = await model.generateContent([prompt, ...imageParts]);
            const parsedMenu = JSON.parse(result.response.text());

            const extracted: ExtractedItem[] = parsedMenu.map((item: any) => ({
                name: item.name || "",
                price: Number(item.price) || 0,
                description: item.description || "",
                variants: item.variants || [],
                selected: true,
            }));

            setExtractedItems(extracted);
            toast.dismiss();
            toast.success(`Extracted ${extracted.length} items`);
        } catch (error) {
            toast.dismiss();
            console.error("Menu extraction error:", error);

            if (retryCount < MAX_RETRIES - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 2000 * (retryCount + 1))
                );
                return handleExtractItems(retryCount + 1);
            }

            toast.error("Failed to extract menu after multiple attempts. Please try again.");
        } finally {
            setIsExtracting(false);
        }
    };

    const toggleExtractedItem = (index: number) => {
        setExtractedItems(prev =>
            prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item)
        );
    };

    const updateExtractedItem = (index: number, field: keyof ExtractedItem, value: any) => {
        setExtractedItems(prev =>
            prev.map((item, i) => i === index ? { ...item, [field]: value } : item)
        );
    };

    const removeExtractedItem = (index: number) => {
        setExtractedItems(prev => prev.filter((_, i) => i !== index));
    };

    const addExtractedToList = () => {
        const selected = extractedItems.filter(item => item.selected);
        if (selected.length === 0) {
            toast.error("No items selected");
            return;
        }

        const newItems: LocalMenuItem[] = selected.map(item => ({
            id: crypto.randomUUID(),
            name: item.name,
            price: item.price,
            description: item.description,
            image_url: "",
            is_veg: undefined,
            variants: item.variants,
            tags: [],
        }));

        setItems(prev => [...prev, ...newItems]);
        setExtractedItems([]);
        setMenuImageFiles([]);
        toast.success(`Added ${selected.length} items to list`);
    };

    // ─── Get All Images Handler ───
    const handleGetAllImages = async () => {
        const itemsWithoutImages = items.filter(item => !item.image_url);
        if (itemsWithoutImages.length === 0) {
            toast.info("All items already have images!");
            return;
        }

        setIsFetchingImages(true);
        setImagesFetchedCount(0);

        let successCount = 0;
        for (const item of itemsWithoutImages) {
            try {
                const searchTerm = categoryName
                    ? `${item.name} ${categoryName}`
                    : item.name;

                const response = await axios.post(
                    "https://images.cravings.live/api/images/search-google",
                    { itemName: searchTerm },
                    { headers: { "Content-Type": "application/json" } }
                );

                const imageUrl = response.data?.data?.imageUrl;
                if (imageUrl) {
                    setItems(prev =>
                        prev.map(i => i.id === item.id ? { ...i, image_url: imageUrl } : i)
                    );
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to fetch image for ${item.name}:`, error);
            }
            setImagesFetchedCount(prev => prev + 1);
        }

        setIsFetchingImages(false);
        toast.success(`Added images to ${successCount} items`);
    };

    // ─── Save Category Handler ───
    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            toast.error("Please enter a category name");
            return;
        }
        if (items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        setIsSaving(true);
        setSavingProgress({ current: 0, total: items.length });

        try {
            const category = await addCategory(categoryName.trim(), userData?.id);
            if (!category) {
                toast.error("Failed to create category");
                setIsSaving(false);
                return;
            }

            let successCount = 0;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                setSavingProgress({ current: i + 1, total: items.length });

                try {
                    await addItem({
                        name: item.name,
                        price: item.variants.length > 0 ? 0 : item.price,
                        image_url: item.image_url,
                        description: item.description,
                        category: {
                            id: category.id,
                            name: category.name,
                            priority: category.priority || 0,
                            is_active: true,
                        },
                        is_veg: item.is_veg,
                        variants: item.variants,
                        tags: item.tags,
                        is_available: true,
                    } as any);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to save item ${item.name}:`, error);
                }
            }

            if (successCount === items.length) {
                toast.success(`Category "${categoryName}" created with ${successCount} items!`);
            } else {
                toast.success(`Saved ${successCount}/${items.length} items. ${items.length - successCount} failed.`);
            }
            onBack();
        } catch (error) {
            console.error("Failed to save category:", error);
            toast.error("Failed to save category");
        } finally {
            setIsSaving(false);
        }
    };

    const itemsWithoutImages = items.filter(item => !item.image_url).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">Add New Category</h2>
                        <p className="text-muted-foreground">Create a category with menu items</p>
                    </div>
                </div>
            </div>

            {/* Category Name */}
            <Card>
                <CardHeader>
                    <CardTitle>Category Name</CardTitle>
                </CardHeader>
                <CardContent>
                    <Input
                        required
                        placeholder="e.g. Starters, Main Course, Beverages"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* Items List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Items ({items.length})</CardTitle>
                    {items.length > 0 && itemsWithoutImages > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGetAllImages}
                            disabled={isFetchingImages}
                        >
                            {isFetchingImages ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {imagesFetchedCount}/{itemsWithoutImages}
                                </>
                            ) : (
                                <>
                                    <ImagePlus className="h-4 w-4 mr-2" />
                                    Get Images ({itemsWithoutImages})
                                </>
                            )}
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No items added yet. Add items manually or extract from an image below.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {item.image_url ? (
                                                    <Img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="h-10 w-10 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{item.name}</span>
                                                {item.variants.length > 0 && (
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        ({item.variants.length} options)
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.variants.length > 0
                                                    ? `${item.variants[0].price} - ${item.variants[item.variants.length - 1].price}`
                                                    : item.price
                                                }
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                                                {item.description}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditForm(item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Items Section */}
            {!isAddingItemManually && !isAIMode && (
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={openManualForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item Manually
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setIsAIMode(true); setIsAddingItemManually(false); }}
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Menu Extract
                    </Button>
                </div>
            )}

            {/* Manual Item Form */}
            {isAddingItemManually && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{editingItemId ? "Edit Item" : "Add Item"}</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setIsAddingItemManually(false); setEditingItemId(null); }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Name & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Name</label>
                                <Input
                                    placeholder="e.g. Butter Chicken"
                                    value={manualItem.name}
                                    onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Base Price</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={manualItem.price}
                                    onChange={(e) => setManualItem({ ...manualItem, price: e.target.value })}
                                    disabled={variants.length > 0}
                                />
                                {variants.length > 0 && (
                                    <p className="text-xs text-muted-foreground">Price is determined by variants</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Describe the dish..."
                                value={manualItem.description}
                                onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })}
                            />
                        </div>

                        {/* Food Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Food Type</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <label className="flex-1 flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-accent">
                                    <input
                                        type="radio"
                                        name="food_type_manual"
                                        checked={manualItem.is_veg === true}
                                        onChange={() => setManualItem({ ...manualItem, is_veg: true })}
                                        className="accent-green-600"
                                    />
                                    <span className="text-sm">Vegetarian</span>
                                </label>
                                <label className="flex-1 flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-accent">
                                    <input
                                        type="radio"
                                        name="food_type_manual"
                                        checked={manualItem.is_veg === false}
                                        onChange={() => setManualItem({ ...manualItem, is_veg: false })}
                                        className="accent-red-600"
                                    />
                                    <span className="text-sm">Non-Vegetarian</span>
                                </label>
                                <label className="flex-1 flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-accent">
                                    <input
                                        type="radio"
                                        name="food_type_manual"
                                        checked={manualItem.is_veg === null || manualItem.is_veg === undefined}
                                        onChange={() => setManualItem({ ...manualItem, is_veg: undefined })}
                                        className="accent-gray-600"
                                    />
                                    <span className="text-sm">Other</span>
                                </label>
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Variants / Options</label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditingVariantIndex(null);
                                        setNewVariant({ name: "", price: 0 });
                                        setShowVariantForm(!showVariantForm);
                                    }}
                                >
                                    {showVariantForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1" /> Add Option</>}
                                </Button>
                            </div>

                            {showVariantForm && (
                                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Option Name (e.g. Half)"
                                            value={newVariant.name}
                                            onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Price"
                                            value={newVariant.price}
                                            onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={cancelVariantEdit}>Cancel</Button>
                                        <Button type="button" size="sm" onClick={addVariantToForm}>
                                            {editingVariantIndex !== null ? "Update" : "Add"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {variants.length > 0 && (
                                <div className="space-y-2">
                                    {variants.map((variant, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            <div>
                                                <p className="font-medium">{variant.name}</p>
                                                <p className="text-sm text-muted-foreground">{variant.price}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => startEditingVariant(index)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Image */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Item Image</label>
                            {manualItem.image_url ? (
                                <div className="flex items-center gap-3">
                                    <div
                                        className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
                                        onClick={() => setIsImageModalOpen(true)}
                                    >
                                        <Img
                                            src={manualItem.image_url}
                                            alt={manualItem.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => setManualItem(prev => ({ ...prev, image_url: "" }))}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-20 border-dashed"
                                    onClick={() => setIsImageModalOpen(true)}
                                >
                                    <Plus className="h-5 w-5 mr-2" />
                                    Select Image
                                </Button>
                            )}
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Tags</label>
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsTagsModalOpen(true)}>
                                    Manage ({manualItem.tags.length})
                                </Button>
                            </div>
                            {manualItem.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {manualItem.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className={`${getTagColor(tag)} border`}>
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setIsAddingItemManually(false); setEditingItemId(null); }}
                            >
                                Cancel
                            </Button>
                            <Button type="button" className="flex-1" onClick={handleManualItemSubmit}>
                                {editingItemId ? "Save Changes" : "Add to List"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AI Image Upload Section */}
            {isAIMode && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>AI Menu Extract</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setIsAIMode(false); setExtractedItems([]); setMenuImageFiles([]); }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Upload Area */}
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Upload images of your menu and AI will extract the items automatically.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Images
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleMenuImagesChange}
                                />
                            </div>

                            {/* Image Previews */}
                            {menuImagePreviews.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {menuImagePreviews.map((preview, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                                            <Img
                                                src={preview}
                                                alt={`Menu image ${i + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {menuImageFiles.length > 0 && extractedItems.length === 0 && (
                                <Button
                                    onClick={() => handleExtractItems()}
                                    disabled={isExtracting}
                                    className="w-full"
                                >
                                    {isExtracting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Extracting...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Extract Items from Images
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        {/* Extracted Items */}
                        {extractedItems.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">
                                        Extracted Items ({extractedItems.filter(i => i.selected).length} selected)
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const allSelected = extractedItems.every(i => i.selected);
                                            setExtractedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                                        }}
                                    >
                                        {extractedItems.every(i => i.selected) ? "Deselect All" : "Select All"}
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {extractedItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 border rounded-lg space-y-2 transition-colors ${
                                                item.selected ? "bg-card" : "bg-muted/30 opacity-60"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={item.selected}
                                                    onChange={() => toggleExtractedItem(index)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => updateExtractedItem(index, "name", e.target.value)}
                                                        placeholder="Name"
                                                        className="text-sm"
                                                    />
                                                    <Input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => updateExtractedItem(index, "price", parseFloat(e.target.value) || 0)}
                                                        placeholder="Price"
                                                        className="text-sm"
                                                    />
                                                    <Input
                                                        value={item.description}
                                                        onChange={(e) => updateExtractedItem(index, "description", e.target.value)}
                                                        placeholder="Description"
                                                        className="text-sm"
                                                    />
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="shrink-0"
                                                    onClick={() => removeExtractedItem(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                            {item.variants.length > 0 && (
                                                <div className="ml-8 flex flex-wrap gap-1">
                                                    {item.variants.map((v, vi) => (
                                                        <Badge key={vi} variant="outline" className="text-xs">
                                                            {v.name}: {v.price}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <Button onClick={addExtractedToList} className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add {extractedItems.filter(i => i.selected).length} Selected to List
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Footer - Save / Cancel */}
            <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={onBack} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    className="flex-1"
                    onClick={handleSaveCategory}
                    disabled={isSaving || !categoryName.trim() || items.length === 0}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving {savingProgress.current}/{savingProgress.total}...
                        </>
                    ) : (
                        `Save Category (${items.length} item${items.length !== 1 ? "s" : ""})`
                    )}
                </Button>
            </div>

            {/* Image Grid Modal for manual item */}
            <ImageGridModalV2
                isOpen={isImageModalOpen}
                onOpenChange={setIsImageModalOpen}
                itemName={manualItem.name}
                category={categoryName}
                currentImage={manualItem.image_url}
                onSelectImage={(newImageUrl: string) => {
                    setManualItem(prev => ({ ...prev, image_url: newImageUrl }));
                    setIsImageModalOpen(false);
                }}
            />

            {/* Tags Modal */}
            {isTagsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background w-full max-w-2xl rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg">Manage Tags</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsTagsModalOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {TAG_CATEGORIES.map((category) => (
                                <div key={category.name} className="space-y-3">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                        {category.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {category.tags.map((tag) => (
                                            <label
                                                key={tag}
                                                className={`flex items-center space-x-2 cursor-pointer border rounded-full px-3 py-1.5 text-sm transition-all ${
                                                    manualItem.tags.includes(tag)
                                                        ? category.color + " ring-2 ring-offset-1 ring-offset-background"
                                                        : "bg-card hover:bg-accent"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={manualItem.tags.includes(tag)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setManualItem(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                                                        } else {
                                                            setManualItem(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                <span>{tag}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t bg-muted/20 flex justify-end">
                            <Button onClick={() => setIsTagsModalOpen(false)}>
                                Done ({manualItem.tags.length} selected)
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
