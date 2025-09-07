"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { INSERT_QR_CODE, UPDATE_QR_CODE, DELETE_QR_CODE } from "@/api/qrcodes";
import { toast } from "sonner";

interface QrCode {
  id?: string;
  qr_number: number;
  table_number: string;
  no_of_scans?: number;
  partner_id: string;
}

export function QrManagementModal({ 
  partnerId,
  onSuccess 
}: { 
  partnerId: string;
  onSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [currentQr, setCurrentQr] = useState<Partial<QrCode>>({
    qr_number: 0,
    table_number: '',
    partner_id: partnerId
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleAddQr = async () => {
    setIsLoading(true);
    try {
      if (!currentQr.qr_number || !currentQr.table_number) {
        throw new Error("QR number and table number are required");
      }

      await fetchFromHasura(INSERT_QR_CODE, {
        object: {
          qr_number: currentQr.qr_number,
          table_number: currentQr.table_number,
          partner_id: partnerId,
          no_of_scans: 0,
          created_at: new Date().toISOString() // Assuming you want to set created_at
        }
      });

      toast.success("QR code added successfully");
      onSuccess();
      setCurrentQr({
        qr_number: 0,
        table_number: '',
        partner_id: partnerId
      });
    } catch (error) {
      toast.error("Failed to add QR code");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="ml-2">
        Manage QR Codes
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage QR Codes</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qrNumber" className="text-right">
                QR Number
              </Label>
              <Input
                id="qrNumber"
                type="number"
                value={currentQr.qr_number || ''}
                onChange={(e) => setCurrentQr({
                  ...currentQr,
                  qr_number: parseInt(e.target.value)
                })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tableNumber" className="text-right">
                Table Number
              </Label>
              <Input
                id="tableNumber"
                value={currentQr.table_number || ''}
                onChange={(e) => setCurrentQr({
                  ...currentQr,
                  table_number: e.target.value
                })}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleAddQr}
              disabled={isLoading || !currentQr.qr_number || !currentQr.table_number}
            >
              {isLoading ? "Adding..." : "Add QR Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}