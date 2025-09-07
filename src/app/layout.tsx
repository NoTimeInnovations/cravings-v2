import type { Metadata } from "next";
import Script from "next/script"; // Import Script for Google Analytics
import "./globals.css";
// import { Navbar } from "@/components/Navbar";
// import Snow from "@/components/Snow";
// import PwaInstallPrompt from "@/components/PwaInstallPrompt";
// import RateUsModal from "@/components/RateUsModal";
import "@smastrom/react-rating/style.css";
import { Toaster } from "@/components/ui/sonner";
import AuthInitializer from "@/providers/AuthInitializer";
import BottomNav from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import { getAuthCookie } from "./auth/actions";
import WhatsappGroupJoinAlertDialog from "@/components/WhatsappGroupJoinAlertDialog";
import { cookies, headers } from "next/headers";
// import CravingsCashInfoModal from "@/components/CravingsCashInfoModal";
// import SyncUserOfferCoupons from "@/components/SyncUserOfferCoupons";
// import LocationAccess from "@/components/LocationAccess";
// import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Cravings",
  description: "Find the best food deals in your area",
  icons: ["/icon-64x64.png", "/icon-192x192.png", "/icon-512x512.png"],
  metadataBase: new URL("https://cravings.live"),
  openGraph: {
    title: "Cravings",
    description: "Find the best food deals in your area",
    type: "website",
    images: ["/ogImage_default.jpeg"],
  },
};

const petrazFilter = "PETRAZ";
const bottomNavFilter = ["PETRAZ" , "HENZU" , "DOWNTREE"];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthCookie();
  const headerList = await headers();

  const pathname = headerList.get("set-cookie")?.includes("pathname=")
    ? headerList.get("set-cookie")?.split("pathname=")[1].split(";")[0]
    : undefined;

  let isPetraz = false;
  let isBottomNavHidden = false;

  if (pathname) {
    console.log("Current Pathname:", decodeURIComponent(pathname || ""));

    isPetraz = pathname.includes(petrazFilter); 
    isBottomNavHidden = bottomNavFilter.some(filter => pathname.includes(filter));

    console.log("Is Petraz:", isPetraz);
    console.log("Is Bottom Nav Hidden:", isBottomNavHidden);
  }

  return (
    <html lang="en">
      <head>
        {/* Google Analytics Script */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7SV68LS8J6');
            `,
          }}
        />
      </head>
      <body className={`antialiased`}>
        <AuthInitializer />
        {(user?.role === "user" || !user) && (
          <WhatsappGroupJoinAlertDialog isPetraz={isPetraz} />
        )}
        <Toaster richColors closeButton />
        {/* <Snow /> */}
        <Navbar userData={user} />
        {/* <RateUsModal /> */}

        {/* pwa install is currently turned off */}
        {/* <PwaInstallPrompt /> */}

        {children}
        {!isBottomNavHidden ? <BottomNav userData={user} /> : null}
      </body>
    </html>
  );
}
