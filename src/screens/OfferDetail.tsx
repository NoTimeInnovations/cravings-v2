"use client";
import { Suspense, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Partner, useAuthStore } from "@/store/authStore";
import Share from "@/components/Share";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import DiscountBadge from "@/components/DiscountBadge";
import Link from "next/link";
// import { useReviewsStore } from "@/store/reviewsStore";
import { Offer } from "@/store/offerStore_hasura";
import { Button } from "@/components/ui/button";
import { useClaimedOffersStore } from "@/store/claimedOfferStore_hasura";
import ClaimedOfferModal from "@/components/ClaimedOfferModal";
import Img from "@/components/Img";
import { getFeatures } from "@/lib/getFeatures";
import ImageCarousel from "@/components/offerDetail/ImageCarousel";
import { OfferCard } from "@/components/admin/OfferCard";

export default function OfferDetail({
  offer,
  hotelData,
}: {
  offer: Offer;
  hotelData: Partner;
}) {
  const { id: offerId } = useParams();
  const navigate = useRouter();
  const { userData } = useAuthStore();
  const [isClaimed, setClaimed] = useState(false);
  // const { getAverageReviewByHotelId } = useReviewsStore();
  const { addClaimedOffer, claimedOffers, fetchCalimedOfferByOfferId } =
    useClaimedOffersStore();
  const [showClaimModalOpen, setClaimModalOpen] = useState(false);

  useEffect(() => {
    if (userData) {
      fetchCalimedOfferByOfferId(offerId as string);
    }
  }, [offerId, userData]);

  useEffect(() => {
    if (claimedOffers?.find((offer) => offer.offer?.id === offerId)) {
      setClaimed(true);
    } else {
      setClaimed(false);
    }
  }, [claimedOffers]);

  const handleClaimOffer = async () => {
    if (!isClaimed) {
      await addClaimedOffer(offer);
    }

    // setClaimModalOpen(true);
    navigate.push(
      getFeatures(offer?.partner?.feature_flags || "")?.delivery?.access
        ? "/hotels/" + hotelData.id
        : hotelData?.location
    );
  };

  const isUpcoming = new Date(offer.start_time) > new Date();
  const discount =
    (offer.menu.price ?? 0) > 0 && (offer.offer_price ?? 0) > 0
      ? Math.round(
          ((offer.menu.price - (offer.offer_price ?? 0)) / offer.menu.price) *
            100
        )
      : 0;

  return (
    <div className="min-h-[110vh] w-full md:bg-gradient-to-b from-orange-50 to-orange-100 md:pt-10">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden shadow-none border-none transition-shadow relative rounded-none md:rounded-xl">
          <div
            onClick={() => navigate.back()}
            className="absolute cursor-pointer top-3 left-3 text-white z-[50] bg-orange-600 rounded-full p-2"
          >
            <ArrowLeft width={30} height={30} />
          </div>

          <div className="relative">
            {/* <Img
              src={offer.menu.image_url ?? "/image_placeholder.png"}
              alt={offer.menu.name}
              width={500}
              height={500}
              className="w-full h-64 object-cover"
            /> */}
            <ImageCarousel imageUrls={offer.image_urls ? offer.image_urls : [offer.menu.image_url]} altText={offer.menu.name} />

            <div className="grid bg-gradient-to-t from-black to-transparentr p-5 sm:p-3 absolute bottom-0 left-0 w-full">
              <Share
                offerId={offerId || ""}
                className={"absolute bottom-6 right-2"}
              />

              {offer.menu?.price > 0 && (
                <span className="text-white/70 line-through text-xl">
                  ₹{offer.menu.price.toFixed(0)}
                </span>
              )}
              {(offer.offer_price ?? 0 > 0) && (
                <span className="text-4xl font-bold text-white">
                  ₹{(offer.offer_price ?? 0).toFixed(0)}
                </span>
              )}
              {/* <div className="text-base font-bold text-orange-600 flex items-center gap-1">
                <span>★</span> */}
              {/* <span>{offer.rating?.toFixed(1) || "0"}</span> */}
              {/* </div> */}
            </div>
          </div>
          {discount > 0 && <DiscountBadge discount={discount} />}
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <CardTitle className="text-3xl font-bold text-pretty">
                  {offer.menu.name}
                </CardTitle>
                {offer.menu.description && (
                  <CardDescription>{offer.menu.description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link
              href={`/hotels/${hotelData.id}`}
              className="text-lg text-gray-700 grid grid-cols-2  gap-2 bg-gray-50 p-3 rounded-xl w-full"
            >
              <div className="grid">
                <UtensilsCrossed />
                <span>{offer.partner?.store_name}</span>
                {/* <Suspense>
                  <div className="flex items-center mt-1  gap-2 text-black/60 text-sm w-fit">
                    <Star
                      className="text-orange-600 fill-orange-600"
                      size={20}
                    />
                    {getAverageReviewByHotelId(hotelData?.id as string) ?? 0}
                  </div>
                </Suspense> */}
                <span className="text-sm mt-1">
                  {/* Followers : {hotelData?.followers?.length ?? 0} */}
                </span>
              </div>

              <div className="flex justify-end items-center">
                {/* <div className="text-base bg-orange-600 text-white rounded-xl px-3 py-2">
                  {hotelData?.followers?.some((f) => f.user == user?.uid)
                    ? "Unfollow"
                    : "Follow"}
                </div> */}
              </div>
            </Link>
            <div className="space-y-6 mt-5">
              <div className="space-y-3">
                {isUpcoming && (
                  <div className="flex items-center text-lg text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <CountdownTimer
                      endTime={offer.end_time}
                      upcoming={
                        new Date(offer.start_time).setHours(0, 0, 0, 0) >
                        new Date().setHours(0, 0, 0, 0)
                      }
                    />
                  </div>
                )}
                <div className="flex items-center text-lg text-gray-500">
                  <MapPin className="w-4 h-4 mr-2" />
                  {offer.partner?.district}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {offer.items_available} items{" "}
                    {isUpcoming ? "left" : "available"}
                  </Badge>
                  {offer.enquiries > 0 && (
                    <Badge
                      variant="secondary"
                      className={
                        offer.enquiries > (offer.items_available ?? 0)
                          ? "bg-red-600 text-white"
                          : "bg-orange-500 text-white"
                      }
                    >
                      {offer.enquiries > (offer.items_available ?? 0)
                        ? "High Demand"
                        : "In Demand"}
                    </Badge>
                  )}
                </div>
              </div>

              {showClaimModalOpen && (
                <ClaimedOfferModal
                  isOpen={showClaimModalOpen}
                  setOpen={setClaimModalOpen}
                  offer={offer}
                />
              )}

              <div className={`h-[36px] w-full`}>
                {offer.deletion_status === 1 || isUpcoming ? (
                  <Button
                    disabled
                    className="w-full flex justify-center py-2 px-3 text-[15px] font-semibold transition-all text-white bg-gray-600 hover:bg-gray-700 rounded-sm"
                  >
                    {isUpcoming ? "Upcoming" : "Expired"}
                  </Button>
                ) : (
                  <>
                    {userData ? (
                      <Button
                        onClick={handleClaimOffer}
                        className="w-full flex justify-center py-2 px-3 text-[15px] font-semibold transition-all text-white bg-orange-600 hover:bg-orange-700 rounded-sm"
                      >
                        {isClaimed ? "Claimed" : "Claim Offer"}
                      </Button>
                    ) : (
                      <Link
                        className={`w-full flex justify-center py-2 px-3 text-[15px] font-semibold transition-all text-white bg-orange-600 hover:bg-orange-700 rounded-sm `}
                        href={
                          getFeatures(offer?.partner?.feature_flags || "")
                            ?.delivery?.access
                            ? "/hotels/" + hotelData.id
                            : hotelData?.location
                        }
                      >
                        Claim Offer
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
