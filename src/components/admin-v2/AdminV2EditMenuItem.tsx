import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, X, Edit, Trash2, Plus } from "lucide-react";
import { useMenuStore, MenuItem } from "@/store/menuStore_hasura";
import { toast } from "sonner";
import Img from "../Img";
import { ImageGridModalV2 } from "../bulkMenuUpload/ImageGridModalV2";
import CategoryDropdown from "@/components/ui/CategoryDropdown";
import { TAG_CATEGORIES, getTagColor } from "@/data/foodTags";
import { useCategoryStore, formatDisplayName } from "@/store/categoryStore_hasura";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface AdminV2EditMenuItemProps {
    item: MenuItem;
    onBack: () => void;
}

export interface Variant {
    name: string;
    price: number;
}

export function AdminV2EditMenuItem({ item, onBack }: AdminV2EditMenuItemProps) {
    const { updateItem, deleteItem } = useMenuStore();
    const { userData } = useAuthStore();
    const { categories, fetchCategories } = useCategoryStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

    const [editingItem, setEditingItem] = useState({
        ...item,
        price: item.price.toString(),
        tags: item.tags || [],
        is_price_as_per_size: item.is_price_as_per_size || false,
        is_top: item.is_top || false,
    });

    const [variants, setVariants] = useState<Variant[]>(item.variants || []);
    const [newVariant, setNewVariant] = useState<Omit<Variant, "id">>({
        name: "",
        price: 0,
    });
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
    const [showVariantForm, setShowVariantForm] = useState(false);

    useEffect(() => {
        if (userData?.id) {
            fetchCategories(userData.id);
        }
    }, [userData, fetchCategories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem.name || !editingItem.category) {
            toast.error("Please fill all the required fields");
            return;
        }

        if (variants.length === 0 && (!editingItem.price || parseFloat(editingItem.price) <= 0) && !editingItem.is_price_as_per_size) {
            toast.error("Please set either a base price, add options, or enable 'Price as per Size'");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateItem(item.id!, {
                name: editingItem.name,
                price: editingItem.is_price_as_per_size ? 0 : parseFloat(editingItem.price),
                image_url: editingItem.image_url,
                description: editingItem.description,
                category: editingItem.category,
                is_veg: editingItem.is_veg,
                variants: variants.length > 0 ? variants : [],
                tags: editingItem.tags,
                is_price_as_per_size: editingItem.is_price_as_per_size,
                is_top: editingItem.is_top,
            });
            toast.success("Item updated successfully");
            onBack();
        } catch (error) {
            console.error("Failed to update item:", error);
            toast.error("Failed to update item");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
            try {
                await deleteItem(item.id!);
                onBack();
            } catch (error) {
                console.error("Failed to delete item:", error);
                toast.error("Failed to delete item");
            }
        }
    };

    // Variant Handlers
    const addVariant = () => {
        if (!newVariant.name) {
            toast.error("Please fill the option name");
            return;
        }
        if (!newVariant.price && confirm("Price is zero. Do you want to proceed?") === false) {
            return;
        }
        setVariants([...variants, { ...newVariant }]);
        setNewVariant({ name: "", price: 0 });
        setShowVariantForm(false);
    };

    const updateVariant = () => {
        if (editingVariantIndex === null || !newVariant.name) {
            toast.error("Please fill option name");
            return;
        }
        if (!newVariant.price && confirm("Price is zero. Do you want to proceed?") === false) {
            return;
        }
        const updatedVariants = [...variants];
        updatedVariants[editingVariantIndex] = { ...newVariant };
        setVariants(updatedVariants);
        setNewVariant({ name: "", price: 0 });
        setEditingVariantIndex(null);
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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold">Edit Item</h2>
                        <p className="text-muted-foreground">Update menu item details</p>
                    </div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Item Name</label>
                                <Input
                                    required
                                    placeholder="e.g. Butter Chicken"
                                    value={editingItem.name}
                                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    placeholder="Describe the dish..."
                                    value={editingItem.description}
                                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <CategoryDropdown
                                        value={editingItem.category.name}
                                        onChange={(value, category) => {
                                            // 1. If the dropdown gives us the full category object (e.g. newly created), use it directly
                                            if (category) {
                                                setEditingItem({
                                                    ...editingItem,
                                                    category: {
                                                        ...category,
                                                        is_active: category.is_active ?? true,
                                                        priority: category.priority ?? 0,
                                                    },
                                                });
                                                return;
                                            }

                                            // 2. Fallback: Find in the categories array if only name is returned
                                            const selectedCategory = categories.find(
                                                (c) => formatDisplayName(c.name) === formatDisplayName(value)
                                            );
                                            if (selectedCategory) {
                                                setEditingItem({
                                                    ...editingItem,
                                                    category: {
                                                        ...selectedCategory,
                                                        is_active: selectedCategory.is_active ?? true,
                                                        priority: selectedCategory.priority ?? 0,
                                                    },
                                                });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Base Price (₹)</label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={editingItem.price}
                                        onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                        disabled={variants.length > 0}
                                    />
                                    {variants.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Price is determined by variants
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Food Type</label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <label className="flex-1 flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-accent">
                                        <input
                                            type="radio"
                                            name="food_type"
                                            checked={editingItem.is_veg === true}
                                            onChange={() => setEditingItem({ ...editingItem, is_veg: true })}
                                            className="accent-green-600"
                                        />
                                        <span className="text-sm">🟢 Vegetarian</span>
                                    </label>
                                    <label className="flex-1 flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-accent">
                                        <input
                                            type="radio"
                                            name="food_type"
                                            checked={editingItem.is_veg === false}
                                            onChange={() => setEditingItem({ ...editingItem, is_veg: false })}
                                            className="accent-red-600"
                                        />
                                        <span className="text-sm">🔴 Non-Vegetarian</span>
                                    </label>
                                    <label className="flex-1 flex items-center space-x-2 cursor-pointer border p-3 rounded-md hover:bg-accent">
                                        <input
                                            type="radio"
                                            name="food_type"
                                            checked={editingItem.is_veg === null || editingItem.is_veg === undefined}
                                            onChange={() => setEditingItem({ ...editingItem, is_veg: undefined })}
                                            className="accent-gray-600"
                                        />
                                        <span className="text-sm">⚪ Other</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Top Dish / Bestseller</label>
                                        <p className="text-xs text-muted-foreground">Mark this item as a bestseller</p>
                                    </div>
                                    <Switch
                                        checked={editingItem.is_top}
                                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_top: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="space-y-0.5">
                                        <label className="text-sm font-medium">Price as per Size / Custom</label>
                                        <p className="text-xs text-muted-foreground">Prompt for price when adding to cart</p>
                                    </div>
                                    <Switch
                                        checked={editingItem.is_price_as_per_size}
                                        onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_price_as_per_size: checked })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Variants / Options</CardTitle>
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
                                {showVariantForm ? "Cancel" : <><Plus className="h-4 w-4 mr-2" /> Add Option</>}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                        <Button type="button" size="sm" onClick={editingVariantIndex !== null ? updateVariant : addVariant}>
                                            {editingVariantIndex !== null ? "Update" : "Add"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {variants.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No variants added.</p>
                            ) : (
                                <div className="space-y-2">
                                    {variants.map((variant, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                            <div>
                                                <p className="font-medium">{variant.name}</p>
                                                <p className="text-sm text-muted-foreground">₹{variant.price}</p>
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
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Image</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {editingItem.image_url ? (
                                    <div
                                        className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
                                        onClick={() => setIsImageModalOpen(true)}
                                    >
                                        <Img
                                            src={editingItem.image_url}
                                            alt={editingItem.name}
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                            <p className="text-white font-medium">Change Image</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-40 border-dashed"
                                        onClick={() => setIsImageModalOpen(true)}
                                    >
                                        <Plus className="h-6 w-6 mr-2" />
                                        Select Image
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Tags</CardTitle>
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsTagsModalOpen(true)}>
                                Manage
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {editingItem.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {editingItem.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className={`${getTagColor(tag)} border`}>
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No tags selected</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" className="w-full" onClick={onBack}>
                            Cancel
                        </Button>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </form>

            <ImageGridModalV2
                isOpen={isImageModalOpen}
                onOpenChange={setIsImageModalOpen}
                itemName={editingItem.name}
                category={editingItem.category.name}
                currentImage={editingItem.image_url}
                onSelectImage={(newImageUrl: string) => {
                    setEditingItem((prev) => ({ ...prev, image_url: newImageUrl }));
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
                                                className={`flex items-center space-x-2 cursor-pointer border rounded-full px-3 py-1.5 text-sm transition-all ${editingItem.tags.includes(tag)
                                                    ? category.color + " ring-2 ring-offset-1 ring-offset-background"
                                                    : "bg-card hover:bg-accent"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editingItem.tags.includes(tag)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setEditingItem((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
                                                        } else {
                                                            setEditingItem((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
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
                                Done ({editingItem.tags.length} selected)
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
