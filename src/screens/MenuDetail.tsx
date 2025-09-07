// "use client";
// import { ArrowLeft, MapPin, Star, UtensilsCrossed } from "lucide-react";
// import { useRouter } from "next/navigation";
// import Image from "next/image";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Partner } from "@/store/authStore";
// import { MenuItem } from "@/store/menuStore-hasura";
// import Link from "next/link";
// // import { useReviewsStore } from "@/store/reviewsStore";
// import { Suspense, useEffect, useState } from "react";
// import Share from "@/components/Share";
// import RateThis from "@/components/RateThis";
// // import ReviewsList from "@/components/menuDetails/ReviewsList";

// interface MenuDetailProps {
//   menuItem: MenuItem;
//   hotelData: Partner;
// }

// const MenuDetail = ({ menuItem, hotelData }: MenuDetailProps) => {
//   const router = useRouter();
//   // const { getAverageReviewByHotelId } = useReviewsStore();
//   const [averageReview, setAverageReview] = useState(0);

//   // useEffect(() => {
//   //   getAverageReviewByHotelId(hotelData.id as string).then((review) => {
//   //     setAverageReview(review);
//   //   });
//   // }, []);

//   return (
//     <div className="min-h-screen w-full md:bg-gradient-to-b from-orange-50 to-orange-100 md:pt-10">
//       <div className="max-w-4xl mx-auto">
//         <Card className="overflow-hidden shadow-none border-none transition-shadow relative rounded-none md:rounded-xl">
//           <div
//             onClick={() => router.back()}
//             className="absolute cursor-pointer top-3 left-3 text-white z-[50] bg-orange-600 rounded-full p-2"
//           >
//             <ArrowLeft width={30} height={30} />
//           </div>

//           <div className="relative">
//             <Img
//               src={menuItem.image}
//               alt={menuItem.name}
//               width={500}
//               height={500}
//               priority={false}
//               quality={60}
//               className="w-full h-64 object-cover"
//             />

//             <div className="grid bg-gradient-to-t from-black to-transparent p-5 sm:p-3 absolute bottom-0 left-0 w-full">
//               <Share
//                 menuId={menuItem.id}
//                 hotelId={hotelData.id}
//                 className={"absolute bottom-6 right-2"}
//               />
//               <span className="text-4xl font-bold text-white">
//                 ₹{menuItem.price.toFixed(2)}
//               </span>
//             </div>
//           </div>

//           <CardHeader>
//             <div className="flex justify-between items-start">
//               <div className="space-y-4">
//                 <CardTitle className="text-3xl font-bold text-pretty">
//                   {menuItem.name}
//                 </CardTitle>
//                 {menuItem.description && (
//                   <CardDescription>{menuItem.description}</CardDescription>
//                 )}
//               </div>
//             </div>
//           </CardHeader>

//           <CardContent>
//             <div className="mb-3">
//                 <div className="flex items-center text-lg text-gray-500">
//                   <MapPin className="w-4 h-4 mr-2" />
//                   {hotelData.district}
//                 </div>
//             </div>

//             <Link
//               href={`/hotels/${hotelData.id}`}
//               className="text-lg text-gray-700 grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl w-full "
//             >
//               <div className="grid">
//                 <UtensilsCrossed />
//                 <span>{hotelData.store_name}</span>
//                 <Suspense>
//                   <div className="flex items-center mt-1 gap-2 text-black/60 text-sm w-fit">
//                     <Star
//                       className="text-orange-600 fill-orange-600"
//                       size={20}
//                     />
//                     {averageReview ?? 0}
//                   </div>
//                 </Suspense>
//                 {/* <span className="text-sm mt-1">
//                   Followers : {hotelData?.followers?.length ?? 0}
//                 </span> */}
//               </div>

//               <div className="flex justify-end items-center">
//                 <div className="text-base bg-orange-600 text-white rounded-xl px-3 py-2">
//                   View Hotel
//                 </div>
//               </div>
//             </Link>

//             {/* Add rate this menu item */}
//             <section className="px-3 pt-10 pb-5 flex sm:justify-center sm:pt-20 sm:pb-10">
//               <RateThis type="menuItem" />
//             </section>

//             {/* Add reviews section */}
//             {/* <section className="px-3 pt-5 pb-10">
//               <ReviewsList 
//                 menuId={menuItem.id} 
//                 hotelId={hotelData.id as string} 
//               />
//             </section> */}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default MenuDetail;
