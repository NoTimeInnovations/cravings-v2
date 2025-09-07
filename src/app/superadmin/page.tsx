import AssignQrPartners from "@/components/superAdmin/AssignQrPartners";
import ExploreOfferManage from "@/components/superAdmin/ExploreOfferManage";
import FeatureFlagManagement from "@/components/superAdmin/FeatureFlagManagement";
import OfferUploadSuperAdmin from "@/components/superAdmin/OfferUploadSuperAdmin";
import EditPartners from "@/components/superAdmin/EditPartners";
// import Analytics from "@/components/superAdmin/Analytics";
// import BulkUpload from "@/components/superAdmin/BulkUpload";
// import OfferDetails from "@/components/superAdmin/OfferDetails";
import PartnerVerification from "@/components/superAdmin/PartnerVerification";
import UpdateHotelUpiId from "@/components/superAdmin/UpdateHotelUpiId";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import SubscriptionManagement from "@/components/superAdmin/SubscriptionManagement";
import QrManagement_v2 from "@/components/superAdmin/QrManagement_v2";
import WhatsappGrpQrCodes from "@/components/superAdmin/WhatsappGrpQrCodes";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

const page = async (props: { searchParams: SearchParams }) => {
  const page = (await props.searchParams).page;
  const pages = [
    {
      name: "Analytics",
      component: null,
      id: "analytics",
      href: "/superadmin/analytics",
    },
    {
      name: "Create Partner",
      component: null,
      id: "create-partner",
      href: "/superadmin/create-partner",
    },
    {
      name: "Create Demo Partner",
      component: null,
      id: "create-demo-partner",
      href: "/demo",
    },
    {
      name: "Partner Verification",
      component: <PartnerVerification />,
      id: "partner-verification",
    },
    // {
    //   name: "Offer Details",
    //   component: <OfferDetails />,
    //   id: "offer-Details",
    // },
    {
      name: "Assign QR",
      component: <AssignQrPartners />,
      id: "assign-qr",
    },
    {
      name: "Bulk QR Management",
      component: <QrManagement_v2 />,
      id: "bulk-qr-management",
    },
    // {
    //   name: "Bulk Upload",
    //   component: <BulkUpload />,
    //   id: "bulk-upload",
    // },
    {
      name: "Update Hotel UPI ID",
      component: <UpdateHotelUpiId />,
      id: "update-hotel-upi-id",
    },
    {
      name: "Offer Upload",
      component: <OfferUploadSuperAdmin />,
      id: "offer-upload",
    },
    {
      name: "Explore",
      component: <ExploreOfferManage />,
      id: "explore-offer-manage",
    },
    {
      name: "Feature Flag Management",
      component: <FeatureFlagManagement />,
      id: "feature-flag-management",
    },
    {
      name: "Edit Partners",
      component: <EditPartners />,
      id: "edit-partners",
    },
    {
      name: "Subscription Management",
      component: <SubscriptionManagement />,
      id: "subscription-management",
    },
    {
      name: "WhatsappGrp QrCodes",
      component: <WhatsappGrpQrCodes />,
      id: "whatsapp-qr-codes",
    }
  ];

  if (page) {
    const selectedPage = pages.find((p) => p.id === page);
    return (
      <main className="px-3 py-5 sm:px-[7.5%] bg-[#FFF7EC] min-h-screen">
        <h1 className="text-2xl lg:text-4xl font-bold mb-5">
          {selectedPage?.name}
        </h1>
        {selectedPage?.component}
      </main>
    );
  } else {
    return (
      <main className="px-3 py-5 sm:px-[7.5%] bg-[#FFF7EC] min-h-screen">
        <h1 className="text-2xl lg:text-4xl font-bold">Dashboard</h1>

        <div className="mt-5">
          {pages.map((p) => (
            p.href ? (
              <Link
                className="font-medium p-4 mt-2 rounded border-2 border-[#ffba79]/20 bg-[#fffefd] flex items-center justify-between"
                href={p.href}
                key={p.name}
              >
                {p.name}
                <ChevronRight size={24} className="text-orange-600" />
              </Link>
            ) : (
              <Link
                className="font-medium p-4 mt-2 rounded border-2 border-[#ffba79]/20 bg-[#fffefd] flex items-center justify-between"
                href={`?page=${p.id}`}
                key={p.name}
              >
                {p.name}
                <ChevronRight size={24} className="text-orange-600" />
              </Link>
            )
          ))}
        </div>
      </main>
    );
  }
};

export default page;
