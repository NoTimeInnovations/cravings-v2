// "use client";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { useAuthStore, userData } from "@/store/authStore";
// import { format } from "date-fns";
// import Link from "next/link";
// import { X } from "lucide-react";
// import { Button } from "./ui/button";
// import { useState, useEffect } from "react";

// interface PaymentHistoryModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   hotelData: UserData;
//   userId: string;
//   // upiData: UpiData | null;
// }

// const PaymentHistoryModal = ({
//   isOpen,
//   onClose,
//   hotelData,
//   userId,
//   upiData,
// }: PaymentHistoryModalProps) => {
//   const { user, updateUserPayment, fetchUserVisit } = useAuthStore();

//   const userVisits = hotelData.followers?.find(
//     (follower) => follower.user === userId
//   )?.visits;



//   const [localPayments, setLocalPayments] = useState<{
//     amount: number;
//     date: string;
//     discount: number;
//     paid: boolean;
//   }[]>([]);

//   // Update local payments when userVisits changes
//   useEffect(() => {
//     const sortedPayments = [...(userVisits?.amountsSpent || [])].sort((a, b) => 
//       new Date(b.date).getTime() - new Date(a.date).getTime()
//     );
//     setLocalPayments(sortedPayments);
//     console.log(sortedPayments);
//     console.log(userVisits);
//     console.log(hotelData);
    
//   }, [userVisits]);

//   const handlePayment = async () => {
//     try {
//       // Update local state immediately
//       setLocalPayments(prev => {
//         const updated = [...prev];
//         if (updated[0]) {
//           updated[0] = { ...updated[0], paid: true };
//         }
//         return updated;
//       });

//       // Update backend
//       await updateUserPayment(user?.uid as string, hotelData?.id as string);
//       await fetchUserVisit(user?.uid as string, hotelData?.id as string);
//     } catch (error) {
//       // Revert local state if backend update fails
//       setLocalPayments([...(userVisits?.amountsSpent || [])].sort((a, b) => 
//         new Date(b.date).getTime() - new Date(a.date).getTime()
//       ));
//       console.error("Payment error:", error);
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="w-[90%] sm:max-w-lg rounded-xl">
//         <DialogHeader className="relative">
//           <Button
//             variant="ghost"
//             size="icon"
//             className="absolute right-0 top-0"
//             onClick={onClose}
//           >
//             <X className="h-4 w-4" />
//           </Button>
//           <DialogTitle className="text-xl font-bold">Payment History</DialogTitle>
//         </DialogHeader>

//         <div className="mt-4">
//           {localPayments.length > 0 ? (
//             <div 
//               className={`divide-y ${
//                 localPayments.length > 5 ? "max-h-[60vh] overflow-y-auto pr-2" : ""
//               }`}
//             >
//               {localPayments.map((payment, index) => (
//                 <div
//                   key={index}
//                   className="py-4 flex justify-between items-end hover:bg-gray-50 rounded-lg px-2"
//                 >
//                   <div>
//                     <p className="text-[10px] text-gray-500">
//                       {format(new Date(payment.date), "dd MMM yyyy, hh:mm a")}
//                     </p>
//                     <div className="flex items-center gap-2">
//                       <p className="text-base line-through text-gray-400">
//                         ₹{payment.amount.toFixed(2)}
//                       </p>
//                       <p className="text-orange-600 font-medium text-sm">
//                         {payment.discount}% OFF
//                       </p>
//                     </div>
//                     <p className="font-bold text-xl text-green-600">
//                       ₹
//                       {(
//                         payment.amount -
//                         (payment.amount * payment.discount) / 100
//                       ).toFixed(2)}
//                     </p>
//                   </div>
//                   <div className="text-right flex flex-col justify-between">
//                     <div className="flex items-center justify-end gap-2">
//                       <p
//                         className={`text-xs ${
//                           payment.paid ? "text-green-600" : "text-red-600"
//                         } font-medium`}
//                       >
//                         {payment.paid ? "Paid" : "Unpaid"}
//                       </p>
//                       {!payment.paid && index === 0 && upiData?.upiId && (
//                         <Link
//                           onClick={handlePayment}
//                           href={`upi://pay?pa=${upiData.upiId}&pn=${
//                             hotelData?.hotelName
//                           }&am=${
//                             payment.amount -
//                             (payment.amount * payment.discount) / 100
//                           }&cu=INR`}
//                           className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded"
//                         >
//                           Pay Now
//                         </Link>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="text-center py-8 text-gray-500">
//               No payment history found
//             </div>
//           )}
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default PaymentHistoryModal; 