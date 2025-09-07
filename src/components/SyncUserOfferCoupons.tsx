// "use client";
// import { useAuthStore } from "@/store/authStore";
// import { useClaimedOffersStore } from "@/store/claimedOffersStore";
// import { useSearchParams } from "next/navigation";
// import React, { useEffect } from "react";

// const SyncUserOfferCoupons = () => {
//   const { syncUserOffersClaimable } = useClaimedOffersStore();
//   const { user } = useAuthStore();
//   const searchParams = useSearchParams();
//   useEffect(() => {
//     if (user?.uid) {
//       syncUserOffersClaimable(user.uid);
//     }
//   }, [user, syncUserOffersClaimable]);

//   useEffect(() => {
//     const token = searchParams.get("token");
//     if (token) {
//       localStorage?.setItem("token", token);
//     }
//   }, [searchParams , user , user?.uid]);

//   return <></>;
// };

// export default SyncUserOfferCoupons;
