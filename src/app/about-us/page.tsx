import HomePage from "@/screens/HomePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cravings | Smart Digital Menu for Restaurants",
  description:
    "Create a beautiful, editable digital menu with QR codes. Update items, manage availability, add specials, and post offers—all in seconds. Perfect for cafes, diners, food trucks, and restaurants.",
  icons: ["/icon-192x192.png"],
  openGraph: {
    title: "Cravings | Smart Digital Menu for Restaurants",
    description:
      "The easiest way to manage your restaurant’s menu. Update prices, add offers, toggle availability, and publish new items instantly. No PDFs. No hassle.",
    images: [
      {
        url: "/ogImage_default.jpeg",
        width: 1200,
        height: 630,
        alt: "Cravings Digital Menu Platform",
      },
    ],
    type: "website",
    locale: "en_US",
    siteName: "Cravings",
    url: "https://www.cravings.live/",
  },
  keywords: [
    "digital menu",
    "qr code menu",
    "restaurant menu software",
    "editable digital menu",
    "menu builder",
    "restaurant menu app",
    "menu management",
    "qr scan menu",
  ],
};

export default function Home() {
  return <HomePage />;
}
