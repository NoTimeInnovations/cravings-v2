"use client";
import React, { useEffect, useState } from "react";
import { usePOSStore } from "@/store/posStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

const PastBillsPage = () => {
  const { pastBills, loadingBills, fetchPastBills, deleteBill } = usePOSStore();
  const [deletingBills, setDeletingBills] = useState<Record<string, boolean>>({});

  const { userData } = useAuthStore();

  useEffect(() => {
    if (userData?.id) {
        fetchPastBills();
    }
  }, [fetchPastBills,userData]);

  if (!userData) {
    return <div>Loading...</div>;
  }

  const handleDelete = async (billId: string) => {
    try {
      setDeletingBills(prev => ({ ...prev, [billId]: true }));
      await deleteBill(billId);
      toast.success('Bill deleted successfully');
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
    } finally {
      setDeletingBills(prev => ({ ...prev, [billId]: false }));
    }
  };

  if (loadingBills) {
    return <div>Loading bills...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Past Bills</h1>
      <div className="grid gap-6">
        {pastBills?.map((bill) => (
          <Card key={bill.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-gray-500">Bill ID: {bill.id}</p>
                  {bill.phone && (
                    <p className="text-sm text-gray-500">Phone: {bill.phone}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-bold">{(bill.totalPrice)}</p>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(bill.id)}
                    disabled={deletingBills[bill.id]}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="divide-y">
                {bill?.items?.map((item) => (
                  <div key={item.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      {((item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {pastBills.length === 0 && (
          <div className="text-center text-gray-500">No past bills found</div>
        )}
      </div>
    </div>
  );
};

export default PastBillsPage;