// "use client";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Clock, MapPin, Tag } from "lucide-react";
// import { type Offer } from "@/store/offerStore";
// import { CountdownTimer } from "@/components/CountdownTimer";
// import Share from "@/components/Share";
// import Link from "next/link";
// import Image from "next/image";

// interface ListingCardProps {
//   offer: Offer;
//   discount: number;
//   claimed: boolean;
//   isUpcoming: boolean;
//   handleOfferClick: (offer: Offer) => void;
// }

// const ListingCard: React.FC<ListingCardProps> = ({
//   offer,
//   discount,
//   claimed,
//   isUpcoming,
//   handleOfferClick,
// }) => {
//   const handleOfferClickInternal = (offer: Offer) => {
//     if (!isUpcoming) {
//       handleOfferClick(offer);
//     }
//   };

//   return (
//     <Card
//       key={offer.id}
//       className="overflow-hidden hover:shadow-xl transition-shadow"
//     >
//       <Link href={`/offers/${offer.id}`}>
//         <div className="flex relative">
//           <Img
//             src={offer.dishImage}
//             alt={offer.dishName}
//             width={300}
//             height={300}
//             className="w-full h-48 object-cover"
//           />
//           <Badge variant="destructive" className="bg-orange-600 absolute right-3 top-3 text-md">
//             {discount}% OFF
//           </Badge>
//         </div>
//         <CardHeader>
//           <div className="flex justify-between items-start">
//             <div className="space-y-2">
//               <CardTitle className="text-xl font-bold">
//                 {offer.dishName}
//               </CardTitle>
//               <p className="text-base font-medium text-gray-700">
//                 {offer.hotelName}
//               </p>
//             </div>
//           </div>
//         </CardHeader>
//       </Link>
//       <CardContent>
//         <div className="space-y-4">
//           <div className="flex justify-between items-center">
//             <span className="text-500 line-through">
//               ₹{offer.originalPrice.toFixed(2)}
//             </span>
//             <span className="text-2xl font-bold text-orange-600">
//               ₹{offer.newPrice.toFixed(2)}
//             </span>
//           </div>
//           <div className="space-y-3">
//             <div className="flex justify-between">
//               <div className="flex flex-col gap-3">
//                 {!isUpcoming && (
//                   <div className="flex items-center text-sm text-gray-500">
//                     <Clock className="w-4 h-4 mr-2" />
//                     <CountdownTimer endTime={offer.toTime} />
//                   </div>
//                 )}
//                 <div className="flex items-center text-sm text-gray-500">
//                   <MapPin className="w-4 h-4 mr-2" />
//                   {offer.area}
//                 </div>
//               </div>
//               <Share offerId={offer.id} />
//             </div>
//             <div className="flex gap-3">
//               <div className="flex flex-wrap gap-2 mt-4">
//                 <Badge
//                   variant="secondary"
//                   className="bg-orange-100 text-orange-600"
//                 >
//                   <Tag className="w-3 h-3 mr-1" />
//                   {offer.itemsAvailable} items{" "}
//                   {isUpcoming ? "left" : "available"}
//                 </Badge>
//               </div>
//               {claimed && (
//                 <div className="flex flex-wrap gap-2 mt-4">
//                   <Badge
//                     variant="secondary"
//                     className="bg-green-600 text-white"
//                   >
//                     Claimed
//                   </Badge>
//                 </div>
//               )}
//               {offer.enquiries > 0 && (
//                 <div className="flex flex-wrap gap-2 mt-4">
//                   <Badge
//                     variant="secondary"
//                     className={
//                       offer.enquiries > offer.itemsAvailable
//                         ? "bg-red-600 text-white"
//                         : "bg-orange-500 text-white"
//                     }
//                   >
//                     {offer.enquiries > offer.itemsAvailable
//                       ? "High Demand"
//                       : "In Demand"}
//                   </Badge>
//                 </div>
//               )}
//             </div>
//           </div>
//           <div className="flex flex-col gap-3">
//             <Button
//               disabled={isUpcoming}
//               onClick={() => handleOfferClickInternal(offer)}
//               className={`w-full ${
//                 isUpcoming
//                   ? "bg-gray-100 disabled:opacity-100 text-[#E63946] font-bold shadow-xl border border-gray-200"
//                   : "bg-orange-600 hover:bg-orange-700"
//               }`}
//             >
//               {claimed ? (
//                 "View Ticket"
//               ) : isUpcoming ? (
//                 <div>
//                   Offer Activates in :{" "}
//                   <CountdownTimer endTime={offer.fromTime}  />
//                 </div>
//               ) : (
//                 "Claim Offer"
//               )}
//             </Button>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default ListingCard;


import React from 'react'

const ListingCard = () => {
  return (
    <div>ListingCard</div>
  )
}

export default ListingCard