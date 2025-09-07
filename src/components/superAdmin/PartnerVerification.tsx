import { fetchFromHasura } from "@/lib/hasuraClient";
import { getInactivePartnersQuery } from "@/api/partners";
import PartnerList from "../partnerVerification/PartnerList";
import { Partner } from "@/store/usePartnerStore";

export default async function PartnerVerificationPage() {
  const response = await fetchFromHasura(getInactivePartnersQuery);
  const partners = (response as { partners: Partner[] }).partners;
  // const partners = response.users as Partner[];

  return <PartnerList initialPartners={partners} />;
}
