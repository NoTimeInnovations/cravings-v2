"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { searchPartners, getMenuItems, updateMenuItemImage, updateMenuItemName, removeVariants } from "./actions";
import { uploadFileToS3 } from "@/app/actions/aws-s3";

interface Partner {
    id: string;
    store_name: string;
    name: string;
    email: string;
}

interface MenuItem {
    id: string;
    name: string;
    image_url: string;
    category: {
        name: string;
    };
    price: number;
    variants: any;
}

interface CategoryAccordionProps {
    categoryName: string;
    items: MenuItem[];
    processingImageId: string | null;
    handlePaste: (e: React.ClipboardEvent<HTMLDivElement>, item: MenuItem) => void;
    handleRemoveVariants: (itemId: string) => void;
    handleNameChange: (itemId: string, newName: string) => void;
}

function CategoryAccordion({ categoryName, items, processingImageId, handlePaste, handleRemoveVariants, handleNameChange }: CategoryAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border rounded shadow-sm bg-white overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="font-semibold text-lg text-gray-800">
                    {categoryName} <span className="text-sm font-normal text-gray-500 ml-2">({items.length} items)</span>
                </div>
                <div>
                    {isOpen ? (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                    ) : (
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border-t">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 text-left w-32">Image (Paste Here)</th>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Price</th>
                                <th className="p-3 text-left">Variants</th>
                                <th className="p-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td
                                        className="p-3 border-r w-32 relative"
                                        tabIndex={0}
                                        onPaste={(e) => handlePaste(e, item)}
                                    >
                                        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center rounded overflow-hidden relative group cursor-pointer border-2 border-transparent focus:border-blue-500 outline-none">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400 text-center">No Image<br />(Click & Paste)</span>
                                            )}

                                            {processingImageId === item.id && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs text-center p-1 transition-opacity">
                                                Click here then Ctrl+V to paste image
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 font-medium">
                                        <input
                                            type="text"
                                            defaultValue={item.name}
                                            onBlur={(e) => {
                                                if (e.target.value !== item.name) {
                                                    handleNameChange(item.id, e.target.value);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            className="border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent w-full p-1"
                                        />
                                    </td>
                                    <td className="p-3">{item.price}</td>
                                    <td className="p-3">
                                        {item.variants ? (
                                            <div className="text-xs max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                                {JSON.stringify(item.variants)}
                                            </div>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="p-3">
                                        {item.variants && (
                                            <button
                                                onClick={() => handleRemoveVariants(item.id)}
                                                className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                                            >
                                                Remove Variants
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function ItemImageChangePage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingImageId, setProcessingImageId] = useState<string | null>(null);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setPartners([]);
            return;
        }
        const res = await searchPartners(query);
        if (res.success) {
            setPartners(res.partners);
        }
    };

    const selectPartner = async (partner: Partner) => {
        setSelectedPartner(partner);
        setPartners([]);
        setSearchQuery("");
        setLoading(true);
        const res = await getMenuItems(partner.id);
        setLoading(false);
        if (res.success) {
            setMenuItems(res.menu);
        } else {
            toast.error("Failed to fetch menu items");
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>, item: MenuItem) => {
        e.preventDefault();
        setProcessingImageId(item.id);

        try {
            const items = e.clipboardData.items;
            let imageUrl = "";

            // Check for image file
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        // Convert to base64
                        const reader = new FileReader();
                        reader.onload = async () => {
                            const base64 = reader.result as string;
                            // Upload to S3
                            try {
                                const uploadedUrl = await uploadFileToS3(base64, `menu/${selectedPartner?.id}/${item.id}-${Date.now()}.jpg`);
                                if (uploadedUrl) {
                                    await updateImageInDb(item.id, uploadedUrl);
                                }
                            } catch (err) {
                                console.error(err);
                                toast.error("Failed to upload image");
                                setProcessingImageId(null);
                            }
                        };
                        reader.readAsDataURL(blob);
                        return; // Stop processing other items
                    }
                }
            }

            // Check for text (URL)
            const text = e.clipboardData.getData("text");
            if (text && (text.startsWith("http") || text.startsWith("data:"))) {
                // If it's a data URL, we might want to upload it too, but let's assume http link for now or handle via upload if it's base64
                if (text.startsWith("data:")) {
                    const uploadedUrl = await uploadFileToS3(text, `menu/${selectedPartner?.id}/${item.id}-${Date.now()}.jpg`);
                    if (uploadedUrl) await updateImageInDb(item.id, uploadedUrl);
                } else {
                    await updateImageInDb(item.id, text);
                }
            } else {
                setProcessingImageId(null);
            }

        } catch (error) {
            console.error(error);
            toast.error("Error processing paste");
            setProcessingImageId(null);
        }
    };

    const updateImageInDb = async (itemId: string, url: string) => {
        const res = await updateMenuItemImage(itemId, url);
        setProcessingImageId(null);
        if (res.success) {
            toast.success("Image updated");
            setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, image_url: url } : m));
        } else {
            toast.error("Failed to update image in DB");
        }
    };

    const handleNameChange = async (itemId: string, newName: string) => {
        // Optimistic update
        setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, name: newName } : m));

        const res = await updateMenuItemName(itemId, newName);
        if (res.success) {
            toast.success("Name updated");
        } else {
            toast.error("Failed to update name");
            // Revert on failure (could refetch, but let's just warn for now)
        }
    };

    const handleRemoveVariants = async (itemId: string) => {
        if (!confirm("Are you sure you want to remove variants for this item?")) return;

        const res = await removeVariants(itemId);
        if (res.success) {
            toast.success("Variants removed");
            setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, variants: null } : m));
        } else {
            toast.error("Failed to remove variants");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Menu Item Image Manager</h1>

            {!selectedPartner && (
                <div className="space-y-4 max-w-xl">
                    <label className="block text-sm font-medium">Search Partner</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="Search by name, store, or email..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {partners.length > 0 && (
                        <div className="border rounded shadow bg-white">
                            {partners.map(p => (
                                <div
                                    key={p.id}
                                    className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0"
                                    onClick={() => selectPartner(p)}
                                >
                                    <div className="font-bold">{p.store_name}</div>
                                    <div className="text-sm text-gray-500">{p.name} ({p.email})</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {selectedPartner && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded">
                        <div>
                            <h2 className="text-xl font-bold">{selectedPartner.store_name}</h2>
                            <p className="text-gray-500">{selectedPartner.email}</p>
                        </div>
                        <button
                            onClick={() => { setSelectedPartner(null); setMenuItems([]); }}
                            className="text-blue-600 underline"
                        >
                            Change Partner
                        </button>
                    </div>

                    {loading ? (
                        <div>Loading menu items...</div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(
                                menuItems.reduce((acc, item) => {
                                    const catName = item.category?.name || "Uncategorized";
                                    if (!acc[catName]) acc[catName] = [];
                                    acc[catName].push(item);
                                    return acc;
                                }, {} as Record<string, MenuItem[]>)
                            ).sort((a, b) => a[0].localeCompare(b[0])).map(([categoryName, items]) => (
                                <CategoryAccordion
                                    key={categoryName}
                                    categoryName={categoryName}
                                    items={items}
                                    processingImageId={processingImageId}
                                    handlePaste={handlePaste}
                                    handleRemoveVariants={handleRemoveVariants}
                                    handleNameChange={handleNameChange}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
