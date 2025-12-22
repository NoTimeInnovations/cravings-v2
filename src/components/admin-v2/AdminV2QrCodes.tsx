"use client";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React, { useEffect, useState, useRef } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Copy, Trash2, Edit, FileSpreadsheet, Eye, Plus, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { useAuthStore } from "@/store/authStore";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateQrCodeOccupiedStatusMutation } from "@/api/orders";

type QrCode = {
    id: string;
    qr_number: string;
    table_number: number | null;
    table_name: string | null;
    partner_id: string;
    partner: {
        store_name: string;
    };
    created_at: string;
    no_of_scans: number;
    is_occupied: boolean;
};

// Query to get ONLY the current partner's QRs
const GET_PARTNER_QRS_QUERY = `
  query GetPartnerQrs($limit: Int!, $offset: Int!, $where: qr_codes_bool_exp!) {
    qr_codes(order_by: {table_number: asc_nulls_last, created_at: desc}, limit: $limit, offset: $offset, where: $where) {
      id
      qr_number
      table_number
      table_name
      partner_id
      no_of_scans
      partner {
        store_name
      }
      created_at
      is_occupied
    }
    qr_codes_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_MAX_TABLE_NUMBER = `
  query GetMaxTableNumber($partner_id: uuid!) {
    qr_codes(limit: 1, order_by: {table_number: desc_nulls_last}, where: {partner_id: {_eq: $partner_id}}) {
      table_number
    }
  }
`;

const INSERT_QR_CODES_MUTATION = `
  mutation InsertQrCodes($objects: [qr_codes_insert_input!]!) {
    insert_qr_codes(objects: $objects) {
      affected_rows
    }
  }
`;

const DELETE_QRS_MUTATION = `
  mutation DeleteQrs($qrIds: [uuid!]) {
    delete_qr_codes(where: {id: {_in: $qrIds}}) {
      affected_rows
    }
  }
`;

const UPDATE_QR_DETAILS_MUTATION = `
  mutation UpdateQrDetails($qrId: uuid!, $tableNumber: Int, $tableName: String) {
    update_qr_codes_by_pk(pk_columns: {id: $qrId}, _set: {table_number: $tableNumber, table_name: $tableName}) {
      id
    }
  }
`;

export function AdminV2QrCodes() {
    const { userData } = useAuthStore();
    const [qrs, setQrs] = useState<QrCode[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const [limit, setLimit] = useState(10);
    const DOMAIN = "www.cravings.live";

    // Filtering
    const [tableSearch, setTableSearch] = useState("");
    const [debouncedTableSearch, setDebouncedTableSearch] = useState("");
    const tableSearchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    const [selectedQrs, setSelectedQrs] = useState(new Set<string>());
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [totalQrs, setTotalQrs] = useState(0);

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createCount, setCreateCount] = useState<number>(1);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingQr, setEditingQr] = useState<QrCode | null>(null);
    const [editForm, setEditForm] = useState({ table_number: "", table_name: "" });

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewingQr, setViewingQr] = useState<QrCode | null>(null);
    const [viewQrCodeUrl, setViewQrCodeUrl] = useState<string>("");

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null); // If null, means bulk delete selected

    // Fetch QRs
    const fetchQrs = async () => {
        if (!userData?.id) return;
        setLoading(true);
        setSelectedQrs(new Set());

        try {
            const offset = (page - 1) * limit;

            let whereClause: any = { partner_id: { _eq: userData.id } };

            if (debouncedTableSearch.trim()) {
                const searchVal = `%${debouncedTableSearch.trim()}%`;
                // Search by table name OR table number (if it's a number)
                const isNum = !isNaN(parseInt(debouncedTableSearch));
                if (isNum) {
                    whereClause._or = [
                        { table_name: { _ilike: searchVal } },
                        { table_number: { _eq: parseInt(debouncedTableSearch) } }
                    ];
                } else {
                    whereClause.table_name = { _ilike: searchVal };
                }
            }

            const { qr_codes, qr_codes_aggregate } = await fetchFromHasura(
                GET_PARTNER_QRS_QUERY,
                { limit, offset, where: whereClause }
            );

            setQrs(qr_codes);
            setTotalQrs(qr_codes_aggregate.aggregate.count);
        } catch (error) {
            console.error("Error fetching QR codes:", error);
            toast.error("Failed to load QR codes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQrs();
    }, [page, limit, debouncedTableSearch, userData?.id]);

    // Debounce Search
    useEffect(() => {
        if (tableSearchDebounceTimer.current) clearTimeout(tableSearchDebounceTimer.current);
        tableSearchDebounceTimer.current = setTimeout(() => {
            setPage(1);
            setDebouncedTableSearch(tableSearch);
        }, 500);
        return () => { if (tableSearchDebounceTimer.current) clearTimeout(tableSearchDebounceTimer.current); };
    }, [tableSearch]);



    const handleOccupancyChange = async (qrId: string, value: string) => {
        const isOccupied = value === "occupied";
        try {
            await fetchFromHasura(updateQrCodeOccupiedStatusMutation, {
                id: qrId,
                is_occupied: isOccupied
            });

            // Optimistic update
            setQrs(prev => prev.map(q => q.id === qrId ? { ...q, is_occupied: isOccupied } : q));
            toast.success(`Table marked as ${isOccupied ? "Occupied" : "Vacant"}`);
        } catch (error) {
            console.error("Error updating occupancy:", error);
            toast.error("Failed to update status");
        }
    };

    // Handlers
    const handleSelectQr = (id: string, checked: boolean) => {
        const newSet = new Set(selectedQrs);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedQrs(newSet);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(qrs.map(q => q.id));
            setSelectedQrs(allIds);
        } else {
            setSelectedQrs(new Set());
        }
    };

    // CREATE LOGIC
    const handleCreateSubmit = async () => {
        if (createCount <= 0 || createCount > 50) {
            toast.error("Please enter a number between 1 and 50");
            return;
        }

        setIsCreating(true);
        try {
            // 1. Get current max table number
            const maxRes = await fetchFromHasura(GET_MAX_TABLE_NUMBER, { partner_id: userData?.id });
            const currentMax = maxRes?.qr_codes?.[0]?.table_number || 0;

            // 2. Prepare objects
            const newQrObjects = Array.from({ length: createCount }, (_, i) => ({
                qr_number: currentMax + i + 1, // Just using table number sequence for qr_number too, or irrelevant
                table_number: currentMax + i + 1,
                partner_id: userData?.id,
                created_at: new Date().toISOString(),
            }));

            await fetchFromHasura(INSERT_QR_CODES_MUTATION, { objects: newQrObjects });
            toast.success(`${createCount} new QR codes created!`);
            setIsCreateOpen(false);
            fetchQrs();
        } catch (error) {
            console.error("Error creating QRs:", error);
            toast.error("Failed to create QR codes");
        } finally {
            setIsCreating(false);
        }
    };

    // EDIT LOGIC
    const openEdit = (qr: QrCode) => {
        setEditingQr(qr);
        setEditForm({
            table_number: qr.table_number?.toString() || "",
            table_name: qr.table_name || ""
        });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async () => {
        if (!editingQr) return;

        setIsUpdating(true);
        try {
            await fetchFromHasura(UPDATE_QR_DETAILS_MUTATION, {
                qrId: editingQr.id,
                tableNumber: editForm.table_number ? parseInt(editForm.table_number) : null,
                tableName: editForm.table_name || null
            });
            toast.success("QR Code updated");
            setIsEditOpen(false);
            setEditingQr(null);
            // Optimistic update or refetch
            setQrs(prev => prev.map(q => q.id === editingQr.id ? {
                ...q,
                table_number: editForm.table_number ? parseInt(editForm.table_number) : null,
                table_name: editForm.table_name || null
            } : q));
        } catch (error) {
            console.error(error);
            toast.error("Failed to update");
        } finally {
            setIsUpdating(false);
        }
    };

    // DELETE LOGIC
    const openDelete = (id: string | null) => {
        setDeletingId(id);
        setIsDeleteOpen(true);
    };

    const handleDeleteSubmit = async () => {
        const idsToDelete = deletingId ? [deletingId] : Array.from(selectedQrs);
        if (idsToDelete.length === 0) return;

        setIsDeleting(true);
        try {
            await fetchFromHasura(DELETE_QRS_MUTATION, { qrIds: idsToDelete });
            toast.success("QR codes deleted");
            setSelectedQrs(new Set());
            setIsDeleteOpen(false);
            setDeletingId(null);
            fetchQrs();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
        } finally {
            setIsDeleting(false);
        }
    };

    // VIEW LOGIC
    const openView = async (qr: QrCode) => {
        setViewingQr(qr);
        const store = qr.partner?.store_name || "store";
        const qrUrl = `https://${DOMAIN}/qrScan/${store.replace(/\s+/g, "-")}/${qr.id}`;
        try {
            const url = await QRCode.toDataURL(qrUrl);
            setViewQrCodeUrl(url);
            setIsViewOpen(true);
        } catch (e) {
            toast.error("Could not generate QR image");
        }
    };

    const handleCopyLink = (qr: QrCode) => {
        const store = qr.partner?.store_name || "store";
        const qrUrl = `https://${DOMAIN}/qrScan/${store.replace(/\s+/g, "-")}/${qr.id}`;
        navigator.clipboard.writeText(qrUrl);
        toast.success("Link copied");
    };

    const generateTableSheet = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Table QR Codes");
            worksheet.columns = [
                { header: "Table No", key: "table_no", width: 15 },
                { header: "QR Code", key: "qr_code", width: 30 },
                { header: "Scans", key: "scans", width: 10 },
            ];
            // If selected, use selected. Else use all in current view? Or should we fetch ALL for export? 
            // User behavior: usually export all if none selected, or export selected.
            // For now, let's export selected if any, else prompt user?
            // Code below exports selected only as per previous implementation logic.
            const itemsToExport = selectedQrs.size > 0
                ? qrs.filter(q => selectedQrs.has(q.id))
                : qrs; // Fallback to current page if none selected, or maybe fetch all? Let's stick to selected or current page.

            if (itemsToExport.length === 0) {
                toast.error("No QRs to export");
                return;
            }

            for (let i = 0; i < itemsToExport.length; i++) {
                const qrdata = itemsToExport[i];
                const qrUrl = `https://${DOMAIN}/qrScan/${qrdata.partner?.store_name.replace(
                    /\s+/g,
                    "-"
                )}/${qrdata.id}`;
                const base64 = await QRCode.toDataURL(qrUrl);
                worksheet.addRow([qrdata.table_number || qrdata.table_name || "N/A", "", qrdata.no_of_scans || 0]);
                const imageId = workbook.addImage({ base64, extension: "png" });
                worksheet.addImage(imageId, {
                    tl: { col: 1, row: i + 1 },
                    ext: { width: 100, height: 100 },
                });
                worksheet.getRow(i + 2).height = 80;
            }
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "TableQRs.xlsx";
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Excel sheet generated!");
        } catch (error) {
            console.error("Error generating Excel sheet:", error);
            toast.error("Failed to generate table sheet");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">QR Codes</h1>
                    <p className="text-muted-foreground">Manage QR codes for your tables.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Generate New QRs
                </Button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-lg border">
                    <Input
                        placeholder="Search by Table Number or Name..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="max-w-sm"
                    />

                    {selectedQrs.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium px-2">{selectedQrs.size} selected</span>
                            <Button size="sm" variant="outline" onClick={generateTableSheet}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => openDelete(null)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={qrs.length > 0 && selectedQrs.size === qrs.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            <TableHead>Table No</TableHead>
                            <TableHead>Table Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scans</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : qrs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No QR codes found.</TableCell>
                            </TableRow>
                        ) : (
                            qrs.map((qr) => (
                                <TableRow key={qr.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedQrs.has(qr.id)}
                                            onCheckedChange={(checked) => handleSelectQr(qr.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{qr.table_number || "-"}</TableCell>
                                    <TableCell>{qr.table_name || "-"}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={qr.is_occupied ? "occupied" : "vacant"}
                                            onValueChange={(val) => handleOccupancyChange(qr.id, val)}
                                        >
                                            <SelectTrigger className={`w-[110px] h-8 border-none ${qr.is_occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="vacant">Vacant</SelectItem>
                                                <SelectItem value="occupied">Occupied</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>{qr.no_of_scans || 0}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openView(qr)} title="View QR">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleCopyLink(qr)} title="Copy Link">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(qr)} title="Edit">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => openDelete(qr.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : qrs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No QR codes found.</div>
                ) : (
                    qrs.map((qr) => (
                        <Card key={qr.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/40 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedQrs.has(qr.id)}
                                            onCheckedChange={(checked) => handleSelectQr(qr.id, checked as boolean)}
                                        />
                                        <CardTitle className="text-sm font-medium">
                                            Table {qr.table_number || "N/A"}
                                        </CardTitle>
                                    </div>
                                    {qr.table_name && (
                                        <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                                            {qr.table_name}
                                        </span>
                                    )}
                                    <Select
                                        value={qr.is_occupied ? "occupied" : "vacant"}
                                        onValueChange={(val) => handleOccupancyChange(qr.id, val)}
                                    >
                                        <SelectTrigger className={`w-[90px] h-7 text-xs border-none ${qr.is_occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vacant">Vacant</SelectItem>
                                            <SelectItem value="occupied">Occupied</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">Scans</div>
                                    <div className="font-medium">{qr.no_of_scans || 0}</div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 p-2 flex justify-between border-t gap-1">
                                <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => openView(qr)}>
                                    <Eye className="h-4 w-4 mr-2" /> View
                                </Button>
                                <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => handleCopyLink(qr)}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy
                                </Button>
                                <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => openEdit(qr)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="flex-1 h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => openDelete(qr.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Del
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex items-center justify-end gap-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                </Button>
                <span className="text-sm">Page {page}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={qrs.length < limit}>
                    Next
                </Button>
            </div>

            {/* --- DIALOGS --- */}

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate New QR Codes</DialogTitle>
                        <DialogDescription>
                            Enter the number of QR codes to generate. Table numbers will be assigned sequentially starting from your current highest table number.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="qty">Quantity</Label>
                        <Input
                            id="qty"
                            type="number"
                            min="1"
                            max="50"
                            value={createCount}
                            onChange={(e) => setCreateCount(parseInt(e.target.value))}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSubmit} disabled={isCreating}>
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit QR Code</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="t_no">Table Number</Label>
                            <Input
                                id="t_no"
                                type="number"
                                value={editForm.table_number}
                                onChange={(e) => setEditForm({ ...editForm, table_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="t_name">Table Name</Label>
                            <Input
                                id="t_name"
                                value={editForm.table_name}
                                onChange={(e) => setEditForm({ ...editForm, table_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSubmit} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete QR Code</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {deletingId ? "this QR code" : "selected QR codes"}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View QR Dialog */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Table {viewingQr?.table_number || viewingQr?.table_name}</DialogTitle>
                        <DialogDescription>
                            Scan this code to view the menu.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4">
                        {viewQrCodeUrl && (
                            <img src={viewQrCodeUrl} alt="QR Code" className="w-64 h-64 border rounded-lg" />
                        )}
                        <a href={viewQrCodeUrl} download={`QR_Table_${viewingQr?.table_number}.png`} className="mt-4 text-sm text-blue-600 hover:underline flex items-center gap-1">
                            <Download className="h-4 w-4" /> Download Image
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
