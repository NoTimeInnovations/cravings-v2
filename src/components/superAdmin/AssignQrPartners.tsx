import { fetchFromHasura } from "@/lib/hasuraClient";
import { getAllPartnerUpiIdsQuery } from "@/api/partners";
import {AssignQrPartnerList} from "./AssignQrPartnerList";

export interface Hotel {
  id: string;
  store_name: string;
  upi_id?: string;
}

export default async function AssignQrPartners() {
  // Fetch all partner UPI IDs from Hasura
  const response = await fetchFromHasura(getAllPartnerUpiIdsQuery);
  const hotels: Hotel[] = (response as { partners: Hotel[] }).partners;

  return <AssignQrPartnerList initialHotels={hotels} />;
}