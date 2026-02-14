"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";

export default function HelpCenterFacebook() {
  const handleFacebookChat = () => {
    window.open("https://www.facebook.com/Menuthere", "_blank");
  };

  return (
    <div className="h-full justify-center bg-blue-50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/20 flex flex-col items-center text-center space-y-6">
      <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
        <Facebook size={40} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
          Chat on Facebook
        </h2>
        <p className="text-gray-600 dark:text-muted-foreground text-sm">
          Connect with us on our Facebook page for updates and support.
        </p>
      </div>
      <Button
        onClick={handleFacebookChat}
        className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none text-lg"
      >
        Message Us
      </Button>
    </div>
  );
}
