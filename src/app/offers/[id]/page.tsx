import { partnerIdQuery } from "@/api/auth";
import { getOfferById } from "@/api/offers";
import { fetchFromHasura } from "@/lib/hasuraClient";
import OfferDetail from "@/screens/OfferDetail";
import { Partner } from "@/store/authStore";
import { Offer } from "@/store/offerStore_hasura";
import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import React from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const getOffer = unstable_cache(
    async (id: string) => {

      if(!id){
        throw new Error("offer ID not found");
      }
      

      const offers = await fetchFromHasura(getOfferById, {
        id: id,
      })

      if (offers.offers.length < 0) {
        throw new Error("Offer not found");
      }
      
      return offers.offers[0] as Offer;
    },
    [id],
    { tags: [id] }
  );

  const product = await getOffer(id);

  if (!product) {
    throw new Error("Offer not found");
  }

  return {
    title: product.menu.name,
    icons: [product.menu.image_url],
    description: `Get ${product.menu.name} at ${product.partner?.store_name} with Cravings for just ₹${product.offer_price}`,
    openGraph: {
      images: [product.menu.image_url],
      title: product.menu.name,
      description: `Get ${product.menu.name} at ${product.partner?.store_name} with Cravings for just ₹${product.offer_price}`,
    },
  };
}

const page = async ({ params }: Props) => {
  const offerId = (await params).id;

  const getOffer = unstable_cache(
    async (id: string) => {

      if(!id){
        throw new Error("Offer ID not found");
      }
      
      
      const offers = await fetchFromHasura(getOfferById, {
        id: id,
      })

      return offers.offers[0] as Offer;
    },
    [offerId],
    { tags: [offerId] }
  );

  const offerData: Offer = await getOffer(offerId);

  const getHotelData = unstable_cache(
    async (id: string) => {

      if(!id){
        throw new Error("Partner ID not found");
      }
      
      const userData = await fetchFromHasura(partnerIdQuery , {
        id : id,
      })

      // console.log("User Data", userData);
      

      return {
        id,
        ...userData.partners_by_pk,
      } as Partner;
    },
    [offerData.id || ""],
    {
      tags: [offerData.id || ""],
    }
  );

  const hotelData = await getHotelData(offerData?.partner?.id as string);
  console.log("Hotel Data", hotelData);

  return <OfferDetail offer={offerData} hotelData={hotelData} />;
};

export default page;
