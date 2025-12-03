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
import { createCaptainMutation, getCaptainsQuery, deleteCaptainMutation } from "@/api/captains";
import { Loader2, Plus, Trash2, UserCog, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import { getFeatures } from "@/lib/getFeatures";

interface Captain {
    id: string;
    email: string;
    name: string;
    partner_id: string;
    role: string;
}

export function AdminV2CaptainSettings() {
    const { userData } = useAuthStore();
    const [captains, setCaptains] = useState<Captain[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isAddingCaptain, setIsAddingCaptain] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const features = userData?.role === "partner" ? getFeatures(userData.feature_flags || "") : null;
    const isCaptainEnabled = features?.captainordering.enabled;
    const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/captainlogin` : '/captainlogin';

    useEffect(() => {
        if (userData?.role === "partner" && isCaptainEnabled) {
            fetchCaptains();
        } else {
            setIsLoading(false);
        }
    }, [userData, isCaptainEnabled]);

    const fetchCaptains = async () => {
        try {
            const response = await fetchFromHasura(getCaptainsQuery, {
                partner_id: userData?.id
            });
            if (response.captain) {
                setCaptains(response.captain);
            }
        } catch (error) {
            console.error("Error fetching captains:", error);
            toast.error("Failed to load captains");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCaptain = async () => {
        if (!name || !email || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsCreating(true);
        try {
            // Check if email already exists
            const checkEmail = await fetchFromHasura(`
                query CheckCaptainEmail($email: String!) {
                    captain(where: {email: {_eq: $email}}) { id email }
                }
            `, { email });

            if (checkEmail?.captain?.length > 0) {
                throw new Error("This email is already registered.");
            }

            await fetchFromHasura(createCaptainMutation, {
                email,
                password,
                name,
                partner_id: userData?.id,
                role: "captain"
            });

            toast.success("Captain created successfully");
            setIsAddingCaptain(false);
            setName("");
            setEmail("");
            setPassword("");
            fetchCaptains();
        } catch (error: any) {
            console.error("Error creating captain:", error);
            toast.error(error.message || "Failed to create captain");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCaptain = async (id: string) => {
        if (!confirm("Are you sure you want to delete this captain?")) return;

        setIsDeleting(id);
        try {
            // Remove captain reference from orders first
            const updateOrdersMutation = `
                mutation UpdateOrdersWithCaptain($captain_id: uuid!) {
                    update_orders(
                        where: { captain_id: { _eq: $captain_id } }
                        _set: { captain_id: null, orderedby: null }
                    ) { affected_rows }
                }
            `;
            await fetchFromHasura(updateOrdersMutation, { captain_id: id });

            await fetchFromHasura(deleteCaptainMutation, { id });
            toast.success("Captain deleted successfully");
            fetchCaptains();
        } catch (error) {
            console.error("Error deleting captain:", error);
            toast.error("Failed to delete captain");
        } finally {
            setIsDeleting(null);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(loginUrl);
            setCopied(true);
            toast.success("Login URL copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy URL");
        }
    };

    if (!isCaptainEnabled) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <UserCog className="h-16 w-16 text-muted-foreground/50" />
                <h2 className="text-xl font-semibold">Captain Ordering Not Enabled</h2>
                <p className="text-muted-foreground max-w-md">
                    This feature is not currently enabled for your account. Please contact support to enable captain ordering.
                </p>
            </div>
        );
    }

    if (isAddingCaptain) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setIsAddingCaptain(false)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add New Captain</h1>
                        <p className="text-muted-foreground">Create a new account for your staff.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Captain Details</CardTitle>
                        <CardDescription>Enter the login credentials for the new captain.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddingCaptain(false)}>Cancel</Button>
                            <Button onClick={handleCreateCaptain} disabled={isCreating}>
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Captain"}
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
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Captain Management</h1>
                    <p className="text-muted-foreground">Manage your service staff and captains.</p>
                </div>
                <Button onClick={() => setIsAddingCaptain(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Captain
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Captain Login</CardTitle>
                    <CardDescription>Share this login link with your captains to access their accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input
                            value={loginUrl}
                            readOnly
                            className="flex-1 font-mono text-sm"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={copyToClipboard}
                            className="shrink-0"
                        >
                            {copied ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(loginUrl, '_blank')}
                            className="shrink-0"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Captains List</CardTitle>
                    <CardDescription>View and manage your registered captains.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : captains.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No captains found. Add one to get started.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {captains.map((captain) => (
                                        <TableRow key={captain.id}>
                                            <TableCell className="font-medium">{captain.name}</TableCell>
                                            <TableCell>{captain.email}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/90"
                                                    onClick={() => handleDeleteCaptain(captain.id)}
                                                    disabled={isDeleting === captain.id}
                                                >
                                                    {isDeleting === captain.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
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
