"use client";
import React, { useEffect, useMemo, useState } from "react";
import InstaReelEmbed from "../InstaReelEmbeded";
import SideActionButtons from "./SideActionButtons";
import ScrollDownIndicator from "./ScrollDownIndicator";
import VideoStats from "./VideoStats";
import {
  Book,
  Hotel,
  Map,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Verified,
} from "lucide-react";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { InstagramLogoIcon } from "@radix-ui/react-icons";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import ReelSection from "./ReelSection";

const ExploreDetail = ({
  commonOffer,
  decrypted,
}: {
  commonOffer: CommonOffer;
  decrypted: { id: string; role: string } | null;
}) => {
  const allOfferReels = useMemo(
    () => [commonOffer, ...(commonOffer.partner?.common_offers || [])],
    [commonOffer]
  );

  const initialIndex = allOfferReels.findIndex(
    (offer) => offer.id === commonOffer.id
  );

  const [currentIndex, setCurrentIndex] = useState(
    initialIndex !== -1 ? initialIndex : 0
  );

  const currentOffer = allOfferReels[currentIndex];

   useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Main Layout - Reel Focused */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          {/* Reel Video Section */}
          <ReelSection
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            allOfferReels={allOfferReels}
            decrypted={decrypted}
          />

          {/* Content Section */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              {commonOffer.partner && (
                <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full text-xs font-medium">
                  <Verified className="w-4 h-4 t" />
                  Verified
                </div>
              )}

              <div className="space-y-3">
                {/* <div className="flex items-center gap-3 text-orange-600">
                  <UtensilsCrossed className="w-6 h-6" />
                  <span className="text-sm font-medium uppercase tracking-wide">
                    Delicious Deal
                  </span>
                </div> */}
                <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-gray-900 capitalize leading-tight">
                  {currentOffer.item_name.toLowerCase()}
                </h1>
              </div>
            </div>

            {/* Price and Restaurant Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price Card */}
              {currentOffer?.price > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-5">
                      <span className="text-gray-600 text-lg font-medium">
                        Starting at
                      </span>
                      <span className="text-3xl font-black text-orange-600">
                        ₹{currentOffer.price}
                      </span>
                      {/* <span className="text-gray-500 line-through text-lg">
                        ₹{Math.round(commonOffer.price * 1.3)}
                      </span> */}
                    </div>
                    {/* <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Limited time offer</span>
                    </div> */}
                  </div>
                </div>
              )}

              {/* Restaurant Info */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Hotel className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 capitalize flex gap-2 items-center">
                      {commonOffer.partner?.store_name?.toLowerCase() ||
                        commonOffer.partner_name.toLowerCase()}
                      {commonOffer?.partner?.store_name && (
                        <Verified className="w-4 h-4 inline text-orange-500" />
                      )}
                    </h3>
                  </div>
                </div>

                {commonOffer?.district && (
                  <div className="flex items-center gap-3 text-gray-600 text-sm">
                    <Map className="w-5 h-5 text-orange-500" />
                    <span className="capitalize font-medium">
                      {commonOffer.partner?.district?.toLowerCase() ||
                        commonOffer.district.toLowerCase()}
                    </span>
                  </div>
                )}

                {commonOffer?.partner?.phone && (
                  <Link
                    href={`tel:${commonOffer.partner?.country_code}${commonOffer.partner.phone}`}
                    className="flex items-center gap-3 text-gray-600 text-sm mt-2"
                  >
                    <Phone className="w-5 h-5 text-orange-500" />
                    <span className="capitalize font-medium">
                      {commonOffer.partner?.country_code}
                      {commonOffer.partner.phone}
                    </span>
                  </Link>
                )}

                {(commonOffer?.partner?.whatsapp_numbers?.length ?? 0) > 0 && (
                  <Link
                    href={`https://wa.me/${commonOffer.partner?.country_code}${commonOffer.partner?.whatsapp_numbers?.[0].number}`}
                    target="_blank"
                    className="flex items-center gap-3 text-gray-600 text-sm mt-2"
                  >
                    <FaWhatsapp className="w-5 h-5 text-green-500" />
                    <span className="capitalize font-medium">
                      {commonOffer.partner?.country_code}
                      {commonOffer.partner?.whatsapp_numbers?.[0].number}
                    </span>
                  </Link>
                )}

                {/* {(commonOffer?.coordinates?.coordinates.length ?? 0) > 0 && (
                  <GeoAddress commonOffer={commonOffer} />
                )} */}
              </div>
            </div>

            {/* Action Buttons */}

            <div className="flex flex-col gap-4">
              {commonOffer?.partner && (
                <div className="flex gap-2">
                  <Link
                    href={`https://cravings.live/hotels/${commonOffer.partner.store_name}/${commonOffer.partner_id}`}
                    className="bg-white border-2 border-gray-300 text-sm hover:border-orange-300 hover:bg-orange-50 text-gray-700 px-6 py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm flex-1 sm:flex-none"
                  >
                    <ShoppingBag width={20} height={20} />
                    Order Now
                  </Link>

                  <Link
                    href={`https://cravings.live/hotels/${commonOffer.partner.store_name}/${commonOffer.partner_id}`}
                    className="bg-orange-500 text-sm text-nowrap hover:bg-orange-600 text-white px-6 py-4 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-sm flex-1 justify-center sm:flex-none"
                  >
                    <Book className="w-5 h-5" />
                    View Menu
                  </Link>
                </div>
              )}

              <div className="flex gap-2">
                {(commonOffer.location || commonOffer.partner?.location) && (
                  <Link
                    href={
                      commonOffer.partner?.location ||
                      commonOffer.location ||
                      ""
                    }
                    className="bg-orange-500 text-sm text-nowrap hover:bg-orange-600 text-white px-6 py-4 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-sm flex-1 justify-center sm:flex-none"
                  >
                    <MapPin className="w-5 h-5" />
                    Get Directions
                  </Link>
                )}

                {currentOffer.insta_link && (
                  <Link
                    href={currentOffer?.insta_link as string}
                    className="bg-white border-2 border-gray-300 text-sm hover:border-orange-300 hover:bg-orange-50 text-gray-700 px-6 py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm flex-1 sm:flex-none"
                  >
                    <InstagramLogoIcon width={20} height={20} />
                    Instagram
                  </Link>
                )}
              </div>
            </div>

            {/* Description */}
            {currentOffer?.description && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 text-lg">
                  About This Offer
                </h4>
                <p className="text-gray-700 leading-relaxed text-xs">
                  {currentOffer.description}
                </p>
              </div>
            )}

            {/* Additional Info */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                <h5 className="font-semibold text-orange-800 mb-2">
                  Why Choose This Deal?
                </h5>
                <ul className="text-orange-700 text-sm space-y-1">
                  <li>• Fresh ingredients daily</li>
                  <li>• Expert chef preparation</li>
                  <li>• Quick service guarantee</li>
                  <li>• Hygiene standards maintained</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h5 className="font-semibold text-amber-800 mb-2">
                  Restaurant Info
                </h5>
                <div className="text-amber-700 text-sm space-y-1">
                  <div>⏰ Open: 10 AM - 10 PM</div>
                  <div>📞 Call for reservations</div>
                  <div>🚗 Parking available</div>
                  <div>💳 Card payments accepted</div>
                </div>
              </div>
            </div> */}

            {/* Admin Actions */}
            {decrypted?.role === "superadmin" && (
              <div className="bg-gray-100 border border-gray-300 rounded-2xl p-6">
                <h4 className="font-semibold text-gray-800 mb-4">
                  Admin Actions
                </h4>
                <div className="flex flex-wrap gap-3">
                  {/* <DeleteExploreOfferBtn offerId={commonOffer.id} />
                  <ResendOfferMsgBtn offer={commonOffer} /> */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-orange-500 py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-bold text-white mb-4">
            Craving for More? Explore Now!
          </h3>
          <p className="text-orange-100 mb-8 text-sm">
            Don't miss out on this amazing deal from Cravings!
          </p>
          {/* <button className="bg-white text-orange-600 px-12 py-4 rounded-xl font-bold text-xl hover:bg-orange-50 transition-colors shadow-lg">
            Order Now
          </button> */}
          {/* <p className="text-orange-200 text-sm mt-4">
            Login to get exclusive offers and deals!
          </p> */}
        </div>
      </div>
    </div>
  );
};

export default ExploreDetail;
