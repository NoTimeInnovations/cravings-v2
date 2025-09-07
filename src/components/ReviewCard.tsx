// import React from "react";
// import { Star } from "lucide-react";
// import { Review } from "@/store/reviewsStore";

// const ReviewCard = ({ review }: { review: Review }) => {
//   const { userName, rating, comment, createdAt } = review;

//   const formattedDate = new Date(createdAt).toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "2-digit",
//   });

//   return (
//     <div className="space-y-4 py-3">
//       <div>
//         <h3 className="font-medium">{userName}</h3>
//         <div className="flex items-center gap-2 mt-px">
//           <div className="flex items-center">
//             {[...Array(5)].map((_, i) => (
//               <Star
//                 key={i}
//                 className={`w-4 h-4 ${
//                   i < rating
//                     ? "fill-orange-600 text-orange-600"
//                     : "fill-gray-200 text-gray-200"
//                 }`}
//               />
//             ))}
//           </div>
//           <span className="text-[10px] text-gray-500">{formattedDate}</span>
//         </div>
//       </div>
//       <p className="text-gray-600">{comment}</p>
//     </div>
//   );
// };

// export default ReviewCard;
