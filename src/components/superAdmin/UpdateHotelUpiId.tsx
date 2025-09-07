import { fetchFromHasura } from "@/lib/hasuraClient";
import { getAllPartnerUpiIdsQuery } from "@/api/partners";
import {HotelUpiTable} from "./HotelUpiTable";

export interface Hotel {
  id: string;
  store_name: string;
  upi_id?: string;
}

export default async function UpdateHotelUpiId() {
  // Fetch all partner UPI IDs from Hasura
  const response = await fetchFromHasura(getAllPartnerUpiIdsQuery);
  const hotels: Hotel[] = (response as { partners: Hotel[] }).partners;

  // Sort hotels - those without UPI ID first
  const sortedHotels = [...hotels].sort((a, b) => {
    if (!a.upi_id && b.upi_id) return -1;
    if (a.upi_id && !b.upi_id) return 1;
    return a.store_name.localeCompare(b.store_name);
  });

  return <HotelUpiTable initialHotels={sortedHotels} />;
}