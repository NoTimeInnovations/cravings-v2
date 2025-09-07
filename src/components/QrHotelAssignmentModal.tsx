// import React, { useState, useEffect } from "react";
// import {
//   collection,
//   getDocs,
//   query,
//   where,
//   doc,
//   updateDoc,
// } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { toast } from "sonner";
// import { Input } from "./ui/input";
// import { useRouter } from "next/navigation";

// interface QrHotelAssignmentModalProps {
//   qrId: string;
//   currentHotelId: string | null;
//   currentHotelName: string | null;
//   isOpen: boolean;
//   onClose: () => void;
//   onButtonClick?: () => void;
// }

// const QrHotelAssignmentModal = ({
//   qrId,
//   currentHotelId,
//   currentHotelName,
//   isOpen,
//   onClose,
//   onButtonClick,
// }: QrHotelAssignmentModalProps) => {
//   const router = useRouter();
//   const [hotels, setHotels] = useState<
//     Array<{ id: string; hotelName: string }>
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedHotel, setSelectedHotel] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const fetchHotels = async () => {
//       // Get QR codes with assigned hotels
//       const qrCodesRef = collection(db, "qrcodes");
//       const qrQuery = query(qrCodesRef, where("hotelId", "!=", null));
//       const qrSnapshot = await getDocs(qrQuery);
//       const assignedHotelIds = qrSnapshot.docs.map((doc) => doc.data().hotelId);

//       // Get hotels with role "hotel" that aren't already assigned
//       const hotelsRef = collection(db, "users");
//       const hotelQuery = query(hotelsRef, where("role", "==", "hotel"));
//       const hotelSnapshot = await getDocs(hotelQuery);
//       const hotelsList = hotelSnapshot.docs
//         .filter((doc) => !assignedHotelIds.includes(doc.id))
//         .map((doc) => ({
//           id: doc.id,
//           hotelName: doc.data().hotelName,
//         }));
//       setHotels(hotelsList);
//     };

//     if (isOpen) {
//       fetchHotels();
//     }
//   }, [isOpen]);

//   const filteredHotels = hotels.filter((hotel) =>
//     hotel.hotelName.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const handleReassign = async () => {
//     if (!selectedHotel) return;

//     setLoading(true);
//     try {
//       const qrRef = doc(db, "qrcodes", qrId);
//       await updateDoc(qrRef, {
//         hotelId: selectedHotel,
//       });
//       toast.success(
//         `QR code ${currentHotelId ? "re" : ""}assigned successfully`
//       );
//       onClose();
//       router.push(`/hotels/${selectedHotel}?qrScan=true&qid=${qrId}`);
//     } catch (error) {
//       console.error("Error reassigning QR:", error);
//       toast.error(`Failed to ${currentHotelId ? "re" : ""}assign QR code`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
//         <div
//           onClick={onButtonClick}
//           className="bg-orange-600 hover:bg-orange-500 text-white shadow-xl p-2 aspect-square flex items-center justify-center text-[12px] font-bold rounded-full cursor-pointer"
//         >
//           {currentHotelId ? "Reassign" : "Assign"} QR
//         </div>
//       </div>

//       <Dialog open={isOpen} onOpenChange={onClose}>
//         <DialogContent className="w-[90%] sm:max-w-lg rounded-xl">
//           <DialogHeader>
//             <DialogTitle>
//               {currentHotelId ? "Reassign" : "Assign"} QR Code
//             </DialogTitle>
//           </DialogHeader>

//           <div className="py-4">
//             <div className="mb-4">
//               <div className="flex flex-col gap-1 mb-3">
//                 <p className="text-sm text-gray-600">QR Code ID:</p>
//                 <p className="font-medium">{qrId}</p>
//               </div>

//               <div className="flex flex-col gap-1">
//                 <p className="text-sm text-gray-600">Current Assignment:</p>
//                 <p className="font-medium">
//                   {currentHotelName ?? "Not Assigned"}
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm text-gray-600">Search Hotel:</label>
//               <Input
//                 type="text"
//                 placeholder="Search for a hotel..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full"
//               />

//               <div className="mt-2 max-h-48 overflow-y-auto">
//                 {filteredHotels.map((hotel) => (
//                   <div
//                     key={hotel.id}
//                     className={`p-2 cursor-pointer hover:bg-gray-100 rounded ${
//                       selectedHotel === hotel.id ? "bg-gray-100" : ""
//                     }`}
//                     onClick={() => setSelectedHotel(hotel.id)}
//                   >
//                     {hotel.hotelName}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>

//           <DialogFooter className="gap-2">
//             <Button variant="outline" onClick={onClose} disabled={loading}>
//               Cancel
//             </Button>
//             <Button
//               onClick={handleReassign}
//               disabled={!selectedHotel || loading}
//               className="bg-orange-600 hover:bg-orange-500"
//             >
//               {loading
//                 ? `${currentHotelId ? "Re" : ""}Assigning...`
//                 : `${currentHotelId ? "Re" : ""}Assign`}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// };

// export default QrHotelAssignmentModal;
