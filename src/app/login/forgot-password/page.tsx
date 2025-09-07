// "use client";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { UtensilsCrossed } from "lucide-react";
// import { useState } from "react";
// import { useAuthStore } from "@/store/authStore";
// import { useRouter } from "next/navigation";
// import { toast } from "sonner";

// const ForgotPasswordPage = () => {
//   const [email, setEmail] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const { resetPassword } = useAuthStore();
//   const router = useRouter();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);

//     try {
//       await resetPassword(email);
//       toast.success("Password reset email sent! Please check your inbox.");
//       router.push("/login");
//     } catch (error) {
//       console.error("Password reset error:", error);
//       toast.error("Failed to send reset email. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-[80vh] flex items-center justify-center p-4">
//       <div className="max-w-md w-full bg-white rounded-lg p-6">
//         <div className="flex flex-col items-center mb-8">
//           <UtensilsCrossed className="h-12 w-12 text-orange-600 mb-4" />
//           <h1 className="text-3xl font-bold text-gray-900 text-center">
//             Reset Password
//           </h1>
//           <p className="text-gray-600 mt-2 text-center">
//             Enter your email address and we&apos;ll send you a link to reset your password
//           </p>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <Input
//               type="email"
//               placeholder="Email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               className="w-full"
//             />
//           </div>

//           <Button
//             type="submit"
//             className="w-full bg-orange-600 hover:bg-orange-700"
//             disabled={isLoading}
//           >
//             {isLoading ? "Sending..." : "Send Reset Link"}
//           </Button>
//         </form>

//         <div className="mt-4 text-center">
//           <button
//             type="button"
//             onClick={() => router.push("/login")}
//             className="text-orange-600 hover:text-orange-700 text-sm"
//           >
//             Back to Login
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ForgotPasswordPage;

import React from 'react'

const page = () => {
  return (
    <div>page</div>
  )
}

export default page