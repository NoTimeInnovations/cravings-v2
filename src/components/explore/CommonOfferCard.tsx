import React from "react";
import { CommonOffer } from "../superAdmin/OfferUploadSuperAdmin";
import Image from "next/image";
import { truncateWithEllipsis } from "@/lib/truncate";
import Link from "next/link";
import Img from "../Img";
import { Verified } from "lucide-react";

type DistrictKeys =
  | "thiruvananthapuram"
  | "kollam"
  | "pathanamthitta"
  | "alappuzha"
  | "kottayam"
  | "idukki"
  | "ernakulam"
  | "thrissur"
  | "palakkad"
  | "malappuram"
  | "kozhikode"
  | "wayanad"
  | "kannur"
  | "kasaragod";

const districtToShortForm: Record<DistrictKeys, string> = {
  thiruvananthapuram: "tvm",
  kollam: "klm",
  pathanamthitta: "pta",
  alappuzha: "alp",
  kottayam: "ktm",
  idukki: "idk",
  ernakulam: "ekm",
  thrissur: "tsr",
  palakkad: "plk",
  malappuram: "mlp",
  kozhikode: "kkd",
  wayanad: "wyd",
  kannur: "knr",
  kasaragod: "kgd",
};

const CommonOfferCard = ({ commonOffer }: { commonOffer: CommonOffer }) => {
  return (
    <Link
      href={`/explore/${commonOffer.id}`}
      className="relative overflow-hidden"
    >
      <div className="relative aspect-[9/14] lg:aspect-[6/4] w-full rounded-xl overflow-hidden">
        {commonOffer.partner && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-medium">
            <Verified className="w-3 h-3 " />
            Verified
          </div>
        )}
        <Img
          src={commonOffer.image_url as string}
          alt={commonOffer.item_name}
          className="w-full h-full object-cover "
        />
      </div>

      {/* details  */}
      <div className="w-full h-full absolute top-0 left-0 bg-gradient-to-b from-transparent to-black rounded-xl">
        <div className="absolute bottom-0 left-0 p-3 w-full">
          <h1 className="text-white font-bold text-lg capitalize">
            {truncateWithEllipsis(commonOffer.item_name.toLowerCase(), 35)}
          </h1>
          <p className="text-white/80 text-sm capitalize ">
            {truncateWithEllipsis(commonOffer.partner_name.toLowerCase(), 30)}
          </p>

          <div className="flex justify-between items-end ">
            {commonOffer?.price > 0 ? (
              <p className="text-orange-600 font-black text-xl">
                ₹{commonOffer.price}
              </p>
            ) : (
              <p className="text-orange-600 font-bold text-lg"></p>
            )}

            <div className="flex flex-col items-end justify-start">
              {(commonOffer.distance_meters ?? 0) < 300000 ? (
                <div className="text-white/80 font-black text-right uppercase mt-2 text-lg">
                  {((commonOffer.distance_meters ?? 0) / 1000).toFixed(0)}
                  <span className="font-bold text-sm">KM</span>
                </div>
              ) : null}
              <p
                className={`text-white/80 font-bold text-right uppercase ${
                  (commonOffer.distance_meters ?? 0) < 300000
                    ? "text-xs"
                    : "text-base"
                }`}
              >
                {districtToShortForm[
                  commonOffer.district.toLowerCase() as DistrictKeys
                ] || commonOffer.district.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CommonOfferCard;
