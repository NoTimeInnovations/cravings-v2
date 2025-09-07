// "use client";

// import { useState } from "react";
// import { useAuthStore } from "@/store/authStore";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { toast } from "sonner";
// // import Image from "next/image";
// import { X, Check } from "lucide-react";

// export default function PartnerLoginModal() {
//   const { signInPartnerWithEmail } = useAuthStore();
//   // const {signInWithGooglePartner} = useAuthStore();
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//   const [partnerData, setPartnerData] = useState({
//     email: "",
//     password: "",
//   });

//   // const setShowPartnerLoginModal = useAuthStore(state => state.setShowPartnerLoginModal);

//   const handleSuccess = async () => {
//     setIsSuccess(true);
//     await new Promise(resolve => setTimeout(resolve, 1500)); // Show success for 1.5 seconds
//     // setShowPartnerLoginModal(false);
//     setIsSuccess(false); // Reset for next time
//   };

//   const handlePartnerSignIn = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     try {
//       await signInPartnerWithEmail(partnerData.email, partnerData.password);
//       await handleSuccess();
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Failed to sign in");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // const handlePartnerGoogleSignIn = async () => {
//   //   try {
//   //     setIsLoading(true);
//   //     const success = await signInWithGooglePartner();
//   //     if (success) {
//   //       await handleSuccess();
//   //     }
//   //   } catch (error) {
//   //     toast.error(error instanceof Error ? error.message : "Failed to sign in");
//   //   } finally {
//   //     setIsLoading(false);
//   //   }
//   // };

//   // if (!showPartnerLoginModal) return null;

//   return (
//     <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
//       <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
//         <button
//           // onClick={() => setShowPartnerLoginModal(false)}
//           className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
//         >
//           <X className="h-5 w-5" />
//         </button>

//         {isSuccess ? (
//           <div className="flex flex-col items-center justify-center py-8 space-y-4">
//             <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
//               <Check className="h-6 w-6 text-green-600" />
//             </div>
//             <h2 className="text-xl font-semibold text-green-600">Sign In Successful!</h2>
//           </div>
//         ) : (
//           <>
//             <div className="text-center mb-6">
//               <h2 className="text-xl font-semibold">Partner Sign In</h2>
//             </div>

//             <div className="space-y-4">
//               <form onSubmit={handlePartnerSignIn} className="space-y-4">
//                 <div className="space-y-2">
//                   <Label htmlFor="email">Email</Label>
//                   <Input
//                     id="email"
//                     type="email"
//                     placeholder="Enter your email"
//                     value={partnerData.email}
//                     onChange={(e) =>
//                       setPartnerData({ ...partnerData, email: e.target.value })
//                     }
//                     required
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <Label htmlFor="password">Password</Label>
//                   <Input
//                     id="password"
//                     type="password"
//                     placeholder="Enter your password"
//                     value={partnerData.password}
//                     onChange={(e) =>
//                       setPartnerData({ ...partnerData, password: e.target.value })
//                     }
//                     required
//                   />
//                 </div>
//                 <div className="flex gap-2">
//                   <Button
//                     type="submit"
//                     className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
//                     disabled={isLoading}
//                   >
//                     {isLoading ? "Please wait..." : "Sign In"}
//                   </Button>
//                   <Button
//                     type="button"
//                     onClick={() => setShowPartnerLoginModal(false)}
//                     className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
//                     disabled={isLoading}
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               </form>

//               <div className="relative my-6">
//                 <div className="absolute inset-0 flex items-center">
//                   <div className="w-full border-t border-gray-300"></div>
//                 </div>
//                 <div className="relative flex justify-center text-sm">
//                   <span className="px-2 bg-white text-gray-500">Or</span>
//                 </div>
//               </div>

//               {/* <Button
//                 type="button"
//                 onClick={handlePartnerGoogleSignIn}
//                 className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
//                 disabled={isLoading}
//               >
//                 {isLoading ? (
//                   "Please wait..."
//                 ) : (
//                   <>
//                     <Img
//                       width={5}
//                       height={5}
//                       src="https://www.google.com/favicon.ico"
//                       alt="Google"
//                       className="w-5 h-5 mr-2"
//                     />
//                     Sign in with Google
//                   </>
//                 )}
//               </Button> */}
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// } 