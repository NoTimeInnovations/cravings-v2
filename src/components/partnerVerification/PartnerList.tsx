"use client";

import { useEffect } from "react";
import { Partner, usePartnerStore } from "@/store/usePartnerStore";
import PartnerCard from "./PartnerCard";

export default function PartnerList({ initialPartners }: { initialPartners: Partner[] }) {
  const { partners, setPartners } = usePartnerStore();

  useEffect(() => {
    setPartners(initialPartners);
  }, [initialPartners]);

  if (partners.length === 0) {
    return <p className="text-center py-8 text-gray-600">No pending verifications</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {partners.map((partner) => (
        <PartnerCard key={partner.id} partner={partner} />
      ))}
    </div>
  );
}
