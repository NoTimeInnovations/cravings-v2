import { getAuthCookie } from "@/app/auth/actions";
import MainPage from "@/components/WhtaasappQrScan/MainPage";
import SuperAdminSettings from "@/components/WhtaasappQrScan/SuperAdminSettings";
import { fetchFromHasura } from "@/lib/hasuraClient";
import React from "react";

export type QrType = {
  id: string;
  number: string;
  partner_id: string;
  no_of_scans: number;
  created_at: string;
  whatsapp_group_id: string;
  partner: {
    id: string;
    store_name: string;
  };
  whatsapp_group: {
    id: string;
    name: string;
    link: string;
    location: string;
  };
};

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const cookies = await getAuthCookie();

  const { whatsapp_qr_codes_by_pk } = await fetchFromHasura(
    `query GetQrCode($id: uuid!) {
      whatsapp_qr_codes_by_pk(id: $id) {
        id
        number
        partner_id
        no_of_scans
        created_at
        whatsapp_group_id
        whatsapp_group {
          id
          name
          link
          location
        }
        partner {
          id
          store_name
        }
      }
    }`,
    {
      id,
    }
  );

  const QR: QrType = whatsapp_qr_codes_by_pk;

  return (
    <>
      {cookies?.role === "superadmin" && <SuperAdminSettings QR={QR} />}

      {(QR?.whatsapp_group_id && QR?.partner_id) ? (
        <MainPage QR={QR} thisHotelName={QR?.partner?.store_name} />
      ) : cookies?.role !== "superadmin" ? (
        <div>
          Use superadmin account to assign partner to this qr{" "}
          <a className="underline text-blue-500" href="/superLogin">
            Login as superadmin
          </a>
        </div>
      ) : null}
    </>
  );
};

export default page;
