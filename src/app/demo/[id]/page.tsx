"use client";

import React, { useEffect, useState } from "react";
import { useDemoPartnerStore, DemoPartner } from "@/store/demoPartnerStore_hasura";
import { useMenuStore } from "@/store/menuStore_hasura";
import { useParams, useSearchParams } from "next/navigation";
import HotelMenuPage from "@/screens/HotelMenuPage_v2";
import { ThemeConfig } from "@/components/hotelDetail/ThemeChangeButton";
import { getSocialLinks } from "@/lib/getSocialLinks";

export default function DemoPartnerDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const { fetchDemoPartners } = useDemoPartnerStore();
  const { items: menu, fetchMenu } = useMenuStore();
  const [partner, setPartner] = useState<DemoPartner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDemoPartners().then((partners) => {
      const found = partners.find((p) => p.id === id);
      setPartner(found || null);
      setLoading(false);
    });
  }, [id, fetchDemoPartners]);

  useEffect(() => {
    if (partner?.demopartner_id) {
      fetchMenu(partner.demopartner_id);
    }
  }, [partner, fetchMenu]);

  if (loading || !partner) return <div>Loading...</div>;

  const menus = menu.map((item) => ({
    ...item,
    offers: [],
    variantSelections: [],
  }));

  const hoteldata = {
    id: partner.id,
    name: partner.name,
    store_name: partner.name,
    store_banner: partner.banner,
    location: "",
    status: "active",
    upi_id: "",
    description: partner.description,
    whatsapp_numbers: [],
    phone: "",
    district: "",
    delivery_status: false,
    geo_location: { type: "Point", coordinates: [0, 0] },
    delivery_rate: 0,
    delivery_rules: {},
    place_id: undefined,
    theme: JSON.stringify({}),
    currency: "INR",
    feature_flags: "",
    footnote: "",
    social_links: "{}",
    gst_no: undefined,
    gst_percentage: undefined,
    business_type: partner.type,
    is_shop_open: true,
    country: "IN",
    country_code: "+91",
    distance_meters: 0,
    offers: [],
    menus,
    fillteredMenus: menus,
    role: "partner",
    email: "demo@demo.com",
    password: "",
  };

  let theme: ThemeConfig | null = null;
  try {
    theme = typeof hoteldata.theme === "string" ? JSON.parse(hoteldata.theme) : hoteldata.theme;
  } catch {
    theme = null;
  }

  const socialLinks = getSocialLinks(hoteldata as any);
  const selectedCategory = searchParams.get("cat") || "all";

  return (
    <HotelMenuPage
      socialLinks={socialLinks}
      offers={[]}
      hoteldata={hoteldata as any}
      auth={null}
      theme={theme}
      tableNumber={0}
      qrId={null}
      qrGroup={null}
      selectedCategory={selectedCategory}
    />
  );
} 