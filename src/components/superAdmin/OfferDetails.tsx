// "use client";
// import { db } from "@/lib/firebase";
// import { Offer } from "@/store/offerStore";
// import { collection, getDocs } from "firebase/firestore";
// import React, { useEffect, useState } from "react";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "../ui/table";

// const OfferDetails = () => {
//   const [offers, setOffers] = useState<Offer[]>();

//   const fetchOffers = async () => {
//     try {
//       const offersColleciton = await collection(db, "offers");
//       const offersSnapshot = await getDocs(offersColleciton);
//       const offersData: Offer[] = [];
//       offersSnapshot.forEach((doc) => {
//         offersData.push({ id: doc.id, ...doc.data() } as Offer);
//       });

//       offersData.sort((a, b) => {
//         return b.enquiries - a.enquiries;
//       });

//       setOffers(offersData);
//     } catch (error) {
//       console.error("Error fetching offers:", error);
//     }
//   };

//   useEffect(() => {
//     fetchOffers();
//   }, []);
//   return (
//     <Table>
//       <TableHeader>
//         <TableRow>
//           <TableHead>Dish Name</TableHead>
//           <TableHead>Enquires</TableHead>
//           <TableHead>Hotel Name</TableHead>
//           <TableHead>Has Expired</TableHead>
//         </TableRow>
//       </TableHeader>
//       <TableBody>
//         {offers?.map((offer) => (
//           <TableRow key={offer.id}>
//             <TableCell>{offer.dishName}</TableCell>
//             <TableCell>{offer.enquiries}</TableCell>
//             <TableCell>{offer.hotelName}</TableCell>
//             <TableCell>
//               {new Date(offer.toTime) < new Date() ? "Yes" : "No"}
//             </TableCell>
//           </TableRow>
//         ))}
//       </TableBody>
//     </Table>
//   );
// };

// export default OfferDetails;
