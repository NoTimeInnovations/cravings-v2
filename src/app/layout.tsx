// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Dancing_Script, Poppins, Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "@smastrom/react-rating/style.css";
import { Toaster } from "@/components/ui/sonner";
import AuthInitializer from "@/providers/AuthInitializer";
import BottomNav from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import WhatsappGroupJoinAlertDialog from "@/components/WhatsappGroupJoinAlertDialog";
import { PostHogProvider } from "@/providers/posthog-provider";
import { DomainProvider } from "@/providers/DomainProvider";
import type { DomainConfig } from "@/lib/domain-utils";

const MENUTHERE_CONFIG: DomainConfig = {
  name: "Menuthere",
  title:
    "Menuthere | Free QR Code Digital Menu for Restaurants, Cafes & Hotels",
  description:
    "Create your free QR code digital menu in minutes. Real-time updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants, cafes & hotels.",
  logo: "/menuthere-logo.png",
  icon: "/menuthere-logo.png",
  logowhite: "/menuthere-white.png",
  ogImage: "/og_image.png",
};

export const metadata: Metadata = {
  title:
    "Menuthere | Free QR Code Digital Menu for Restaurants, Cafes & Hotels",
  description:
    "Create your free QR code digital menu in minutes. Real-time updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants, cafes & hotels.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192x192.png" }],
  },
  metadataBase: new URL("https://menuthere.com"),
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
    title:
      "Menuthere | Free QR Code Digital Menu for Restaurants, Cafes & Hotels",
    description:
      "Create your free QR code digital menu in minutes. Real-time updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants, cafes & hotels.",
    type: "website",
    images: ["/og_image.png"],
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing-script",
  display: "swap",
});
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://db.onlinewebfonts.com/c/88f10bf18a36407ef36bf30bc25a3618?family=SuisseIntl-Regular"
          rel="stylesheet"
        />
        <link
          href="https://db.onlinewebfonts.com/c/03d5b20d124cd26dc873bd4a8e42313e?family=SuisseIntl-Light"
          rel="stylesheet"
        />
        <link
          href="https://db.onlinewebfonts.com/c/653d9381828e9577fb1e417dc047f89d?family=SuisseIntl-SemiBold"
          rel="stylesheet"
        />
        <link
          href="https://db.onlinewebfonts.com/c/d1a580023d40c546276decde1c711e60?family=SuisseIntl-Bold"
          rel="stylesheet"
        />
        {/* Google Tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17905683217"
          strategy="afterInteractive"
        />
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'AW-17905683217');
              gtag('config', 'G-7SV68LS8J6');
            `,
          }}
        />
        {/* Apollo Tracking Script */}
        <Script
          id="apollo-tracker"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");
o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,
o.onload=function(){window.trackingFunctions.onLoad({appId:"68f911e851e2250021bfaa60"})},
document.head.appendChild(o)}initApollo();`,
          }}
        />
      </head>
      <body
        className={`antialiased font-sans ${inter.variable} ${dancingScript.variable} ${poppins.variable} ${roboto.variable}`}
      >
        <PostHogProvider>
          <DomainProvider config={MENUTHERE_CONFIG}>
            <AuthInitializer />
            <WhatsappGroupJoinAlertDialog />
            <Toaster richColors closeButton position="top-center" />
            <Navbar />
            {children}
            <BottomNav />
          </DomainProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
