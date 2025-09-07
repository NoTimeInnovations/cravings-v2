"use client";

import { useState } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Hotel } from "./UpdateHotelUpiId";

export function UpdateUpiModal({ 
  hotel, 
  onSuccess 
}: { 
  hotel: Hotel;
  onSuccess: (updatedHotel: Hotel) => void;
}) {
  const [newUpiId, setNewUpiId] = useState(hotel.upi_id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateUpiId = async () => {
    if (!newUpiId) return;

    setIsUpdating(true);
    try {

      const updatedHotel = {
        ...hotel,
        upi_id: newUpiId
      };

      onSuccess(updatedHotel);
      toast.success("UPI ID updated successfully");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating UPI ID:", error);
      toast.error("Failed to update UPI ID");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        Update
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update UPI ID for {hotel.store_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Enter new UPI ID"
              value={newUpiId}
              onChange={(e) => setNewUpiId(e.target.value)}
            />
            <Button 
              onClick={handleUpdateUpiId}
              disabled={isUpdating || !newUpiId}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isUpdating ? 'Updating...' : 'Update UPI ID'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}