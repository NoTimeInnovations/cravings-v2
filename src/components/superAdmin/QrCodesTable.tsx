"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { UPDATE_QR_CODE, DELETE_QR_CODE, INSERT_QR_CODE, BULK_INSERT_QR_CODES } from "@/api/qrcodes";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';

interface QrCode {
  id: string;
  qr_number: number;
  table_number: string;
  no_of_scans: number;
}

export function QrCodesTable({
  qrCodes: initialQrCodes,
  partnerId,
  store_name,
}: {
  qrCodes: QrCode[];
  partnerId: string;
  store_name: string;
}) {
  const [qrCodes, setQrCodes] = useState<QrCode[]>(initialQrCodes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedQr, setEditedQr] = useState<Partial<QrCode>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newQr, setNewQr] = useState({
    qr_number: 0,
    table_number: '',
    no_of_scans: 0,
  });
  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [numberOfQrs, setNumberOfQrs] = useState<number>(1);
  const [startingNumber, setStartingNumber] = useState<number>(1);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const handleBulkGenerate = async () => {
    setIsBulkLoading(true);
    try {
      const objects = Array.from({ length: numberOfQrs }, (_, index) => ({
        qr_number: startingNumber + index,
        table_number: String(startingNumber + index),
        partner_id: partnerId,
        no_of_scans: 0,
      }));

      const response = await fetchFromHasura(BULK_INSERT_QR_CODES, {
        objects,
      });

      if (response?.insert_qr_codes?.returning) {
        setQrCodes((prev) => [...prev, ...response.insert_qr_codes.returning]);
        toast.success(`${numberOfQrs} QR codes generated successfully`);
        setIsBulkGenerateOpen(false);
        setNumberOfQrs(1);
        setStartingNumber(1);
      }
    } catch (error) {
      toast.error("Failed to generate QR codes");
      console.error(error);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleEdit = (qr: QrCode) => {    
    setEditingId(qr.id);
    setEditedQr({
      qr_number: qr.qr_number,
      table_number: qr.table_number,
      no_of_scans: qr.no_of_scans,
    });
  };

  const handleSave = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetchFromHasura(UPDATE_QR_CODE, {
        id,
        changes: {
          qr_number: editedQr.qr_number,
          table_number: editedQr.table_number,
          no_of_scans: editedQr.no_of_scans,
        },
      });

      if (response?.update_qr_codes_by_pk) {
        setQrCodes((prev) =>
          prev.map((qr) =>
            qr.id === id
              ? {
                  ...qr,
                  qr_number: editedQr.qr_number ?? qr.qr_number,
                  table_number: editedQr.table_number ?? qr.table_number,
                  no_of_scans: editedQr.no_of_scans ?? qr.no_of_scans,
                }
              : qr
          )
        );
        toast.success("QR code updated successfully");
        setEditingId(null);
      }
    } catch (error) {
      toast.error("Failed to update QR code");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetchFromHasura(DELETE_QR_CODE, { id });

      if (response?.delete_qr_codes_by_pk) {
        setQrCodes((prev) => prev.filter((qr) => qr.id !== id));
        toast.success("QR code deleted successfully");
      }
    } catch (error) {
      toast.error("Failed to delete QR code");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const response = await fetchFromHasura(INSERT_QR_CODE, {
        object: {
          qr_number: newQr.qr_number,
          table_number: newQr.table_number,
          partner_id: partnerId,
          no_of_scans: 0,
        },
      });

      if (response?.insert_qr_codes_one) {
        setQrCodes((prev) => [...prev, response.insert_qr_codes_one]);
        toast.success("QR code created successfully");
        setIsCreateDialogOpen(false);
        setNewQr({ qr_number: 0, table_number: '', no_of_scans: 0 });
      }
    } catch (error) {
      toast.error("Failed to create QR code");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAllLinks = () => {
    const links = qrCodes
      .map(qr => `https://cravings.live/qrScan/${store_name.replace(/\s+/g, '-')}/${qr.id}`)
      .join('\n');
    
    navigator.clipboard.writeText(links)
      .then(() => {
        toast.success("All QR links copied to clipboard");
      })
      .catch((error) => {
        console.error('Failed to copy links:', error);
        toast.error("Failed to copy links to clipboard");
      });
  };

  const handleCopySingleLink = (qrId: string) => {
    const link = `https://cravings.live/qrScan/${store_name.replace(/\s+/g, '-')}/${qrId}`;
    
    navigator.clipboard.writeText(link)
      .then(() => {
        toast.success("QR link copied to clipboard");
      })
      .catch((error) => {
        console.error('Failed to copy link:', error);
        toast.error("Failed to copy link to clipboard");
      });
  };

  const generateTableSheet = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Table QR Codes");

      // Add header
      worksheet.columns = [
        { header: 'Table No', key: 'table_no', width: 15 },
        { header: 'QR Code', key: 'qr_code', width: 30 }
      ];

      for (let i = 0; i < qrCodes.length; i++) {
        const qr = qrCodes[i];
        const qrUrl = `https://cravings.live/qrScan/${store_name.replace(/\s+/g, '-')}/${qr.id}`;
        
        // Generate QR code as base64
        const base64 = await QRCode.toDataURL(qrUrl);

        // Add row
        worksheet.addRow([qr.table_number, '']);

        // Add image to workbook
        const imageId = workbook.addImage({
          base64: base64,
          extension: 'png',
        });

        // Adjust image position in the worksheet (column B, starting at row index + 1)
        worksheet.addImage(imageId, {
          tl: { col: 1, row: i + 1 }, // top-left: column 2 (B), current row
          ext: { width: 100, height: 100 }
        });

        // Set row height to fit the image
        worksheet.getRow(i + 2).height = 80;
      }

      // Write to file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '1.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Table sheet with QR codes generated!");

    } catch (error) {
      console.error("Error generating Excel sheet:", error);
      toast.error("Failed to generate table sheet");
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold">
        {store_name}
      </div>
      <div className="flex justify-end space-x-2">
        <Button onClick={() => setIsBulkGenerateOpen(true)}>Bulk QR Generate</Button>
        <Button onClick={handleCopyAllLinks}>Copy All Links</Button>
        <Button onClick={generateTableSheet}>Generate Table Sheet</Button>
        <Button onClick={() => setIsCreateDialogOpen(true)}>Create New QR Code</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="px-4 py-3">QR ID</TableHead>
              <TableHead className="px-4 py-3">QR Number</TableHead>
              <TableHead className="px-4 py-3">Table Number</TableHead>
              <TableHead className="px-4 py-3">Scans</TableHead>
              <TableHead className="px-4 py-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...qrCodes]
              .sort((a, b) => Number(a.table_number) - Number(b.table_number))
              .map((qr) => (
                <TableRow key={qr.id}>
                <TableCell className="px-4 py-3 font-medium">{qr.id}</TableCell>
                <TableCell className="px-4 py-3">
                  {editingId === qr.id ? (
                    <Input
                      type="number"
                      value={editedQr.qr_number ?? qr.qr_number}
                      onChange={(e) =>
                        setEditedQr({
                          ...editedQr,
                          qr_number: parseInt(e.target.value),
                        })
                      }
                      className="w-24"
                    />
                  ) : (
                    qr.qr_number
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {editingId === qr.id ? (
                    <Input
                      value={editedQr.table_number ?? qr.table_number}
                      onChange={(e) =>
                        setEditedQr({
                          ...editedQr,
                          table_number: e.target.value,
                        })
                      }
                      className="w-32"
                    />
                  ) : (
                    qr.table_number
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {editingId === qr.id ? (
                    <Input
                      type="number"
                      value={editedQr.no_of_scans ?? qr.no_of_scans}
                      onChange={(e) =>
                        setEditedQr({
                          ...editedQr,
                          no_of_scans: parseInt(e.target.value),
                        })
                      }
                      className="w-24"
                    />
                  ) : (
                    qr.no_of_scans
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 space-x-2">
                  {editingId === qr.id ? (
                    <>
                      <Button onClick={() => handleSave(qr.id)} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)} disabled={isLoading}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => handleEdit(qr)} disabled={isLoading}>
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => handleDelete(qr.id)} disabled={isLoading}>
                        Delete
                      </Button>
                      <Button onClick={() => handleCopySingleLink(qr.id)} disabled={isLoading}>
                        Copy Link
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create QR Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New QR Code</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qrNumber" className="text-right">
                QR Number
              </Label>
              <Input
                id="qrNumber"
                type="number"
                value={newQr.qr_number}
                onChange={(e) =>
                  setNewQr({ ...newQr, qr_number: parseInt(e.target.value) })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tableNumber" className="text-right">
                Table Number
              </Label>
              <Input
                id="tableNumber"
                value={newQr.table_number}
                onChange={(e) =>
                  setNewQr({ ...newQr, table_number: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={isLoading || !newQr.qr_number || !newQr.table_number}
            >
              {isLoading ? "Creating..." : "Create QR Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add this dialog component before the closing div */}
      <Dialog open={isBulkGenerateOpen} onOpenChange={setIsBulkGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Multiple QR Codes</DialogTitle>
            <DialogDescription>
              Enter the number of QR codes you want to generate and the starting number.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="numberOfQrs" className="text-right">
                Number of QRs
              </Label>
              <Input
                id="numberOfQrs"
                type="number"
                value={numberOfQrs}
                onChange={(e) => setNumberOfQrs(Math.max(1, parseInt(e.target.value) || 1))}
                className="col-span-3"
                min="1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startingNumber" className="text-right">
                Start From
              </Label>
              <Input
                id="startingNumber"
                type="number"
                value={startingNumber}
                onChange={(e) => setStartingNumber(Math.max(1, parseInt(e.target.value) || 1))}
                className="col-span-3"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkGenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkGenerate} disabled={isBulkLoading}>
              {isBulkLoading ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
