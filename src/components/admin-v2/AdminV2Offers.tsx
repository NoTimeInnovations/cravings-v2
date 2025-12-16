"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useMenuStore } from "@/store/menuStore_hasura";
import { useOfferStore } from "@/store/offerStore_hasura";
import { OfferDetails, SelectedItem } from "../../components/admin/InteractiveOfferCreation";
import { AdminV2InteractiveOfferCreation } from "./AdminV2InteractiveOfferCreation";
import { formatDate } from "@/lib/formatDate";
import Img from "../Img";

export function AdminV2Offers() {
    const { items } = useMenuStore();
    const { addOffer, fetchPartnerOffers, offers, deleteOffer } = useOfferStore();
    const { userData } = useAuthStore();
    const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);
    const [isOfferFetched, setIsOfferFetched] = useState(false);
    const [isDeleting, setDeleting] = useState<Record<string, boolean>>({});
    const [step, setStep] = useState<"list" | "details">("list");
    const [selected, setSelected] = useState<SelectedItem[]>([]);

    const handleOfferDelete = (id: string) => async () => {
        setDeleting({
            ...isDeleting,
            [id]: true,
        });
        await deleteOffer(id);
        setDeleting({
            ...isDeleting,
            [id]: false,
        });
    };

    useEffect(() => {
        (async () => {
            if (userData) {
                await fetchPartnerOffers();
                setTimeout(() => {
                    setIsOfferFetched(true);
                }, 2000);
            }
        })();
    }, [userData]);

    const handleSubmitDetails = async (details: { percentage?: number; amount?: number; offer_type?: string; start_time?: string; end_time?: string }) => {
        try {
            console.log("[Offer Submit] Details:", details);
            const start_time = details.start_time || new Date().toISOString();
            const end_time = details.end_time || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            const offer_type = details.offer_type || 'all';

            const notificationMessage = {
                title: "New Offer",
                body: "A new offer has been added",
            };

            const processOffer = async (payload: any) => {
                console.log("[Offer Submit] Creating offer:", payload);
                await addOffer(payload, notificationMessage);
            }

            if (selected.length > 1) {
                // Multi selection logic
                const percentage = details.percentage || 0;
                for (const sel of selected) {
                    const items_available = sel.item.stocks && sel.item.stocks[0] && typeof sel.item.stocks[0].stock_quantity === 'number'
                        ? sel.item.stocks[0].stock_quantity
                        : 1;

                    if (sel.variants && sel.variants.length > 0) {
                        for (const variant of sel.variants) {
                            const offer_price = Math.round((variant.price || 0) * (1 - percentage / 100));
                            await processOffer({
                                menu_id: sel.item.id,
                                offer_price,
                                items_available,
                                start_time,
                                end_time,
                                offer_type,
                                variant: { name: variant.name, price: variant.price },
                            });
                        }
                    } else {
                        const offer_price = Math.round((sel.item.price || 0) * (1 - percentage / 100));
                        await processOffer({
                            menu_id: sel.item.id,
                            offer_price,
                            items_available,
                            start_time,
                            end_time,
                            offer_type,
                        });
                    }
                }
            } else if (selected.length === 1) {
                const sel = selected[0];
                const items_available = sel.item.stocks && sel.item.stocks[0] && typeof sel.item.stocks[0].stock_quantity === 'number'
                    ? sel.item.stocks[0].stock_quantity
                    : 1;

                if (sel.variants && sel.variants.length > 1 && typeof details.percentage === 'number') {
                    const percentage = details.percentage || 0;
                    for (const variant of sel.variants) {
                        const offer_price = Math.round((variant.price || 0) * (1 - percentage / 100));
                        await processOffer({
                            menu_id: sel.item.id,
                            offer_price,
                            items_available,
                            start_time,
                            end_time,
                            offer_type,
                            variant: { name: variant.name, price: variant.price },
                        });
                    }
                } else {
                    let variantToUse = undefined as undefined | { name: string; price: number };
                    if (sel.variants && sel.variants.length > 0) {
                        variantToUse = sel.variants[0];
                    }
                    await processOffer({
                        menu_id: sel.item.id,
                        offer_price: details.amount,
                        items_available,
                        start_time,
                        end_time,
                        offer_type,
                        variant: variantToUse,
                    });
                }
            }

            setIsCreateOfferOpen(false);
            setStep("list");
            setSelected([]);
        } catch (error) {
            console.error("[Offer Submit] Error creating offers:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {isCreateOfferOpen ? "Create Offer" : "Active Offers"}
                    </h2>
                    {isCreateOfferOpen && step === "list" && (
                        <p className="text-muted-foreground text-sm">Select items to create offer</p>
                    )}
                    {isCreateOfferOpen && step === "details" && (
                        <p className="text-muted-foreground text-sm">Enter offer details</p>
                    )}
                    {!isCreateOfferOpen && (
                        <p className="text-muted-foreground text-sm">Manage your active offers</p>
                    )}
                </div>
                {!isCreateOfferOpen ? (
                    <Button
                        onClick={() => setIsCreateOfferOpen(true)}
                        className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Offer
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCreateOfferOpen(false);
                                setSelected([]);
                                setStep("list");
                            }}
                        >
                            Cancel
                        </Button>
                        {step === "details" && (
                            <Button
                                variant="outline"
                                onClick={() => setStep("list")}
                            >
                                Back
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {isCreateOfferOpen ? (
                <div className="bg-card rounded-lg border shadow-sm p-6">
                    {step === "list" ? (
                        <AdminV2InteractiveOfferCreation
                            onCancel={() => {
                                setIsCreateOfferOpen(false);
                                setSelected([]);
                                setStep("list");
                            }}
                            onNext={(sel: SelectedItem[]) => {
                                setSelected(sel);
                                setStep("details");
                            }}
                            onSelectionChange={(sel: SelectedItem[]) => setSelected(sel)}
                            initialSelected={selected}
                        />
                    ) : (
                        <OfferDetails
                            selected={selected}
                            onBack={() => setStep("list")}
                            onSubmit={handleSubmitDetails}
                        />
                    )}
                </div>
            ) : (
                <>
                    {offers.length > 0 ? (
                        <div className="w-full">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-hidden rounded-lg border bg-card">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="py-3 px-4 font-medium">Item</th>
                                            <th className="py-3 px-4 font-medium">Type</th>
                                            <th className="py-3 px-4 font-medium">Offer Price</th>
                                            <th className="py-3 px-4 font-medium">Validity</th>
                                            <th className="py-3 px-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {offers.map((offer) => {
                                            const isGroup = !!offer.offer_group;
                                            const name = isGroup ? offer.offer_group?.name : offer.menu?.name;
                                            const variantName = !isGroup && offer.variant ? `(${offer.variant.name})` : "";
                                            const imageUrl = !isGroup ? offer.menu?.image_url : null;
                                            const originalPrice = !isGroup ? (offer.variant ? offer.variant.price : offer.menu?.price) : 0;

                                            return (
                                                <tr key={offer.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border">
                                                                {imageUrl ? (
                                                                    <Img src={imageUrl} alt={name || "Offer Item"} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <div className="h-full w-full flex items-center justify-center bg-orange-100 text-orange-600 font-bold text-xs">
                                                                        OFFER
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="font-medium text-foreground">
                                                                {name} <span className="text-muted-foreground text-xs">{variantName}</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-muted-foreground">
                                                        {isGroup ? "Group Offer" : (offer.variant ? "Variant" : "Item")}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col">
                                                            {isGroup ? (
                                                                <span className="font-semibold text-green-600">{offer.offer_group?.percentage}% OFF</span>
                                                            ) : (
                                                                <>
                                                                    <span className="font-semibold text-green-600">₹ {offer.offer_price}</span>
                                                                    {originalPrice && originalPrice > (offer.offer_price || 0) && (
                                                                        <span className="text-xs text-muted-foreground line-through">₹ {originalPrice}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-muted-foreground">
                                                        <div>{formatDate(offer.start_time)}</div>
                                                        <div>to {formatDate(offer.end_time)}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={!!isDeleting[offer.id]}
                                                            onClick={handleOfferDelete(offer.id)}
                                                            className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden grid grid-cols-1 gap-3">
                                {offers.map((offer) => {
                                    const isGroup = !!offer.offer_group;
                                    const name = isGroup ? offer.offer_group?.name : offer.menu?.name;
                                    const variantName = !isGroup && offer.variant ? `(${offer.variant.name})` : "";
                                    const imageUrl = !isGroup ? offer.menu?.image_url : null;
                                    const originalPrice = !isGroup ? (offer.variant ? offer.variant.price : offer.menu?.price) : 0;

                                    return (
                                        <div key={offer.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
                                            <div className="h-[50px] w-[50px] flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-border">
                                                {imageUrl ? (
                                                    <Img src={imageUrl} alt={name || "Offer Item"} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-orange-100 text-orange-600 font-bold text-xs">
                                                        OFFER
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {name} <span className="text-muted-foreground text-xs">{variantName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {isGroup ? (
                                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">
                                                            {offer.offer_group?.percentage}% OFF
                                                        </span>
                                                    ) : (
                                                        <div className="text-xs">
                                                            <span className="font-bold text-green-600">₹ {offer.offer_price}</span>
                                                            {originalPrice && originalPrice > (offer.offer_price || 0) && (
                                                                <span className="text-muted-foreground line-through ml-1">₹ {originalPrice}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                                    Ends: {formatDate(offer.end_time)}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={!!isDeleting[offer.id]}
                                                onClick={handleOfferDelete(offer.id)}
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-card/50">
                            {isOfferFetched ? (
                                <>
                                    <p className="text-muted-foreground mb-4">No active offers found</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCreateOfferOpen(true)}
                                    >
                                        Create your first offer
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    Loading offers...
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
