"use client";

import {
  Partner,
  updatePartnerMutation,
  UpdatePartnerStatusResponse,
} from "@/api/partners";
import { usePartnerStore } from "@/store/usePartnerStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revalidateTag } from "@/app/actions/revalidate";

export default function PartnerCard({ partner }: { partner: Partner }) {
  const removePartner = usePartnerStore((state) => state.removePartner);

  const updateStatus = async (status: "active" | "rejected") => {
    (await fetchFromHasura(updatePartnerMutation, {
      id: partner.id,
      updates: {
        status: status,
      },
    })) as UpdatePartnerStatusResponse;
    removePartner(partner.id);

    revalidateTag(partner.id)
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{partner.store_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">Name: {partner.name}</p>
        <p className="text-sm text-gray-500">District: {partner.phone}</p>
        <p className="text-sm text-gray-500">District: {partner.district}</p>

        <div className="flex gap-3 mt-4">
          <Button
            className="bg-green-600"
            onClick={() => updateStatus("active")}
          >
            Approve
          </Button>
          <Button
            className="bg-red-600"
            onClick={() => updateStatus("rejected")}
          >
            Reject
          </Button>
          {partner.phone && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(`tel:${partner.phone}`)}
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
