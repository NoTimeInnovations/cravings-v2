import HomePage from "@/screens/HomePage";
import type { Metadata } from "next";
// import { redirect } from "next/navigation";
// import OfferMainPage from "../offers/page";

export const metadata: Metadata = {
  title: "Cravings | Restaurant Management Platform | Digital Menus & Delivery",
  description:
    "Cravings is a modern restaurant management platform offering QR code menus, self-ordering, and your own delivery website. Trusted by 80+ restaurants. Control your prices, manage delivery, and delight customers.",
  icons: ["/icon-192x192.png"],
  openGraph: {
    title: "Cravings | Restaurant Management Platform | Digital Menus & Delivery",
    description:
      "Cravings is a modern restaurant management platform offering QR code menus, self-ordering, and your own delivery website. Trusted by 80+ restaurants. Control your prices, manage delivery, and delight customers.",
    images: [
      {
        url: "/ogImage_default.jpeg",
        width: 1200,
        height: 630,
        alt: "Cravings Restaurant Management Platform",
      },
    ],
    type: "website",
    locale: "en_US",
    siteName: "Cravings",
    url: "https://www.cravings.live/",
  },
};

export default function Home() {

  return <HomePage />;

  // return <OfferMainPage/>
}
