"use client"
import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OwnerLoginPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-orange-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <Button
          className="w-full mb-4 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => router.push("/partnerlogin")}
        >
          Sign in as Partner
        </Button>
        <Button
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => router.push("/captainlogin")}
        >
          Sign in as Captain
        </Button>
      </div>
    </div>
  );
} 