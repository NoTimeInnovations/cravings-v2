// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Dancing_Script, Poppins, Roboto } from "next/font/google";
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
import { PostHogProvider } from "@/providers/posthog-provider";
// import CravingsCashInfoModal from "@/components/CravingsCashInfoModal";
// import SyncUserOfferCoupons from "@/components/SyncUserOfferCoupons";
// import LocationAccess from "@/components/LocationAccess";
// import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Cravings",
  description: "Cravings is the ultimate platform for restaurants to manage digital menus, orders, and delivery. Create your QR menu in minutes.",
  icons: ["/icon-64x64.png", "/icon-192x192.png", "/icon-512x512.png"],
  metadataBase: new URL("https://cravings.live"),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Cravings",
    description: "Cravings is the ultimate platform for restaurants to manage digital menus, orders, and delivery. Create your QR menu in minutes.",
    type: "website",
    images: ["/ogImage_default.jpeg"],
  },
};

const petrazFilter = "PETRAZ";
// const bottomNavFilter = [
//   "PETRAZ",
//   "HENZU",
//   "DOWNTREE",
//   "CHILLI'S-RESTAURANT",
//   "Krishnakripa-Residency",
// ];

const bottomNavFilter = [
  "hotels",
  "qrScan",
  "business",
  "get-started",
  "admin-v2",
  "pricing",
];

const navbarFilter = ["get-started", "7eb04e2d-9c20-42ba-a6b6-fce8019cad5f", "admin-v2", "20f7e974-f19e-4c11-b6b7-4385f61f27bf", "admin", "hotels", "qrScan", "order", "my-orders"];

const hideWhatsappGroupJoinDialog = ["Krishnakripa-Residency"];

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dancingScript = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing-script", display: "swap" });
const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthCookie();
  const headerList = await headers();

  const country = headerList.get("x-user-country") || "IN";

  console.log("Country check;", country)

  const pathname = headerList.get("set-cookie")?.includes("pathname=")
    ? headerList.get("set-cookie")?.split("pathname=")[1].split(";")[0]
    : undefined;

  let isPetraz = false;
  let isBottomNavHidden = false;
  let isNavbarHidden = false;
  let isWhatsappDialogHidden = false;

  if (pathname) {
    console.log("Current Pathname:", decodeURIComponent(pathname || ""));

    isPetraz = pathname.includes(petrazFilter);
    isBottomNavHidden = bottomNavFilter.some((filter) =>
      pathname.includes(filter)
    );
    isNavbarHidden = navbarFilter.some((filter) => pathname.includes(filter));

    isWhatsappDialogHidden = hideWhatsappGroupJoinDialog.some((filter) =>
      pathname.includes(filter)
    );

    console.log("Is Petraz:", isPetraz);
    console.log("Is Bottom Nav Hidden:", isBottomNavHidden);
    console.log("Is Navbar Hidden:", isNavbarHidden);
    console.log("Is Whatsapp Dialog Hidden:", isWhatsappDialogHidden);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://db.onlinewebfonts.com/c/88f10bf18a36407ef36bf30bc25a3618?family=SuisseIntl-Regular" rel="stylesheet" />
        <link href="https://db.onlinewebfonts.com/c/03d5b20d124cd26dc873bd4a8e42313e?family=SuisseIntl-Light" rel="stylesheet" />
        <link href="https://db.onlinewebfonts.com/c/653d9381828e9577fb1e417dc047f89d?family=SuisseIntl-SemiBold" rel="stylesheet" />
        <link href="https://db.onlinewebfonts.com/c/d1a580023d40c546276decde1c711e60?family=SuisseIntl-Bold" rel="stylesheet" />
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
      <body className={`antialiased font-sans ${inter.variable} ${dancingScript.variable} ${poppins.variable} ${roboto.variable}`}>
        <PostHogProvider>
          <AuthInitializer />
          {(user?.role === "user" || !user) && !isWhatsappDialogHidden && country === "IN" && (
            <WhatsappGroupJoinAlertDialog isPetraz={isPetraz} />
          )}
          <Toaster richColors closeButton position="top-center" />
          {/* <Snow /> */}
          {!isNavbarHidden ? <Navbar userData={user} country={country} /> : null}
          {/* <RateUsModal /> */}

          {/* pwa install is currently turned off */}
          {/* <PwaInstallPrompt /> */}

          {children}
          {!isBottomNavHidden ? <BottomNav userData={user} country={country} /> : null}
        </PostHogProvider>
      </body>
    </html>
  );
}
