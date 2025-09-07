// "use client";
// import React, { useEffect, useState } from "react";
// // import { useReviewsStore } from "@/store/reviewsStore";
// import ReviewCard from "../ReviewCard";
// import Link from "next/link";
// import { ArrowRight, Star } from "lucide-react";

// const ReviewsList = ({ menuId, hotelId }: { menuId: string, hotelId: string }) => {
//   const {
//     reviews,
//     getLastThreeReviewsByMenuId,
//     getTotalNumberOfReviewsByMenuId,
//   } = useReviewsStore();
//   const [isLoading, setIsLoading] = useState(true);
//   const [totalReviews, setTotalReviews] = useState(0);

//   useEffect(() => {
//     Promise.all([
//       getLastThreeReviewsByMenuId(menuId),
//       getTotalNumberOfReviewsByMenuId(menuId).then(setTotalReviews),
//     ]).then(() => {
//       setIsLoading(false);
//     });
//   }, [menuId]);

//   return (
//     <div>
//       <div className="flex items-center justify-between">
//         <h1 className="text-lg relative flex md:text-3xl text-nowrap items-center gap-2 font-semibold capitalize">
//           Rating & Reviews
//           <span className="text-sm text-gray-500">({totalReviews})</span>
//         </h1>
//         <Link
//           href={`/hotels/${hotelId}/menu/${menuId}/reviews`}
//           className="flex items-center gap-1 text-orange-600 text-sm font-medium"
//         >
//           <ArrowRight className="w-7 h-7" />
//         </Link>
//       </div>

//       <div className="grid gap-5 mt-5 divide-y-2 divide-orange-200">
//         {!isLoading ? (
//           <>
//             {reviews.length > 0 ? (
//               <>
//                 {reviews.map((review) => (
//                   <ReviewCard key={review.id} review={review} />
//                 ))}
//                 <Link
//                   href={`/hotels/${hotelId}/menu/${menuId}/reviews`}
//                   className="text-orange-600 text-sm font-medium py-5"
//                 >
//                   See all reviews
//                 </Link>
//               </>
//             ) : (
//               <p className="text-gray-500 text-sm font-medium py-5">
//                 No reviews yet
//               </p>
//             )}
//           </>
//         ) : (
//           <>
//             {[...Array(3)].map((_, i) => (
//               <div key={i} className="animate-pulse py-3">
//                 <span className="block bg-gray-200 rounded-full w-[150px] h-4" />

//                 <div className="flex items-center gap-2 mt-3">
//                   <div className="flex items-center">
//                     {[...Array(5)].map((_, i) => (
//                       <Star
//                         key={i}
//                         className={`w-4 h-4 fill-gray-200 text-gray-200`}
//                       />
//                     ))}
//                   </div>
//                   <span className="block bg-gray-200 rounded-full w-[50px] h-3" />
//                 </div>

//                 <div className="grid gap-1 mt-2">
//                   <span className="block bg-gray-200 rounded-full w-full h-4" />
//                   <span className="block bg-gray-200 rounded-full w-[80%] h-4" />
//                   <span className="block bg-gray-200 rounded-full w-[30%] h-4" />
//                 </div>
//               </div>
//             ))}
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ReviewsList;
