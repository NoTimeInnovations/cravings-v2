"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
    getDeliveryBoysQuery,
    createDeliveryBoyMutation,
    deleteDeliveryBoyMutation,
    updateDeliveryBoyMutation,
} from "@/api/deliveryBoys";
import { Loader2, Plus, Trash2, Truck, ArrowLeft, Pencil, Download, Copy, Share2, Smartphone } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getFeatures } from "@/lib/getFeatures";
import { Switch } from "@/components/ui/switch";

const DOWNLOAD_PAGE_URL = "/delivery-app/download";

interface DeliveryBoy {
    id: string;
    name: string;
    phone: string;
    is_active: boolean;
    partner_id: string;
}

export function AdminV2DeliveryBoys() {
    const { userData } = useAuthStore();
    const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isAddingDeliveryBoy, setIsAddingDeliveryBoy] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");

    const features = userData?.role === "partner" ? getFeatures(userData.feature_flags || "") : null;
    const isDeliveryEnabled = features?.delivery?.enabled;

    useEffect(() => {
        if (userData?.role === "partner" && isDeliveryEnabled) {
            fetchDeliveryBoys();
        } else {
            setIsLoading(false);
        }
    }, [userData, isDeliveryEnabled]);

    const fetchDeliveryBoys = async () => {
        try {
            const response = await fetchFromHasura(getDeliveryBoysQuery, {
                partner_id: userData?.id,
            });
            if (response.delivery_boys) {
                setDeliveryBoys(response.delivery_boys);
            }
        } catch (error) {
            console.error("Error fetching delivery boys:", error);
            toast.error("Failed to load delivery boys");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDeliveryBoy = async () => {
        if (!name || !phone || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsCreating(true);
        try {
            // Check if phone already exists for this partner
            const checkPhone = await fetchFromHasura(`
                query CheckDeliveryBoyPhone($phone: String!, $partner_id: uuid!) {
                    delivery_boys(where: {phone: {_eq: $phone}, partner_id: {_eq: $partner_id}}) { id }
                }
            `, { phone, partner_id: userData?.id });

            if (checkPhone?.delivery_boys?.length > 0) {
                throw new Error("A delivery boy with this phone number already exists.");
            }

            await fetchFromHasura(createDeliveryBoyMutation, {
                name,
                phone,
                password,
                partner_id: userData?.id,
            });

            toast.success("Delivery boy created successfully");
            setIsAddingDeliveryBoy(false);
            setName("");
            setPhone("");
            setPassword("");
            fetchDeliveryBoys();
        } catch (error: any) {
            console.error("Error creating delivery boy:", error);
            toast.error(error.message || "Failed to create delivery boy");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteDeliveryBoy = async (id: string) => {
        if (!confirm("Are you sure you want to delete this delivery boy?")) return;

        setIsDeleting(id);
        try {
            await fetchFromHasura(deleteDeliveryBoyMutation, { id });
            toast.success("Delivery boy deleted successfully");
            fetchDeliveryBoys();
        } catch (error) {
            console.error("Error deleting delivery boy:", error);
            toast.error("Failed to delete delivery boy");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleToggleActive = async (boy: DeliveryBoy) => {
        try {
            await fetchFromHasura(updateDeliveryBoyMutation, {
                id: boy.id,
                name: boy.name,
                phone: boy.phone,
                is_active: !boy.is_active,
            });
            toast.success(`Delivery boy ${!boy.is_active ? "activated" : "deactivated"}`);
            fetchDeliveryBoys();
        } catch (error) {
            console.error("Error toggling delivery boy status:", error);
            toast.error("Failed to update status");
        }
    };

    const handleEditSave = async (boy: DeliveryBoy) => {
        if (!name || !phone) {
            toast.error("Name and phone are required");
            return;
        }

        try {
            await fetchFromHasura(updateDeliveryBoyMutation, {
                id: boy.id,
                name,
                phone,
                is_active: boy.is_active,
            });

            if (password) {
                await fetchFromHasura(`
                    mutation UpdateDeliveryBoyPassword($id: uuid!, $password: String!) {
                        update_delivery_boys_by_pk(pk_columns: {id: $id}, _set: {password: $password}) { id }
                    }
                `, { id: boy.id, password });
            }

            toast.success("Delivery boy updated successfully");
            setEditingId(null);
            setName("");
            setPhone("");
            setPassword("");
            fetchDeliveryBoys();
        } catch (error) {
            console.error("Error updating delivery boy:", error);
            toast.error("Failed to update delivery boy");
        }
    };

    const startEdit = (boy: DeliveryBoy) => {
        setEditingId(boy.id);
        setName(boy.name);
        setPhone(boy.phone);
        setPassword("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setName("");
        setPhone("");
        setPassword("");
    };

    if (!isDeliveryEnabled) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <Truck className="h-16 w-16 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold">Delivery Not Enabled</h2>
                <p className="text-muted-foreground max-w-md">
                    This feature is not currently enabled for your account. Please contact support to enable delivery.
                </p>
            </div>
        );
    }

    if (isAddingDeliveryBoy) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setIsAddingDeliveryBoy(false)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add New Delivery Boy</h1>
                        <p className="text-muted-foreground">Create a new delivery boy account.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Boy Details</CardTitle>
                        <CardDescription>Enter the details for the new delivery boy.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddingDeliveryBoy(false)}>Cancel</Button>
                            <Button onClick={handleCreateDeliveryBoy} disabled={isCreating}>
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Delivery Boy"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Delivery Boy Management</h1>
                    <p className="text-muted-foreground">Manage your delivery boys.</p>
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Smartphone className="mr-2 h-4 w-4" />
                                Download App
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                                window.open(`${DOWNLOAD_PAGE_URL}?action=download`, "_blank");
                            }}>
                                <Download className="mr-2 h-4 w-4" />
                                Download APK
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                window.open(`${DOWNLOAD_PAGE_URL}?action=copy`, "_blank");
                            }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                window.open(`${DOWNLOAD_PAGE_URL}?action=share`, "_blank");
                            }}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share Link
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => setIsAddingDeliveryBoy(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Delivery Boy
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Delivery Boys</CardTitle>
                    <CardDescription>View and manage your registered delivery boys.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : deliveryBoys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No delivery boys found. Add one to get started.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveryBoys.map((boy) => (
                                        <TableRow key={boy.id}>
                                            {editingId === boy.id ? (
                                                <>
                                                    <TableCell>
                                                        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-32" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 w-32" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (optional)" className="h-8 w-40" type="password" />
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-1">
                                                        <Button variant="outline" size="sm" onClick={() => handleEditSave(boy)}>Save</Button>
                                                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="font-medium">{boy.name}</TableCell>
                                                    <TableCell>{boy.phone}</TableCell>
                                                    <TableCell>
                                                        <Switch
                                                            checked={boy.is_active}
                                                            onCheckedChange={() => handleToggleActive(boy)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => startEdit(boy)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive/90"
                                                            onClick={() => handleDeleteDeliveryBoy(boy.id)}
                                                            disabled={isDeleting === boy.id}
                                                        >
                                                            {isDeleting === boy.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
