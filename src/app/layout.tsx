// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Dancing_Script, Poppins, Roboto, Geist } from "next/font/google";
import Script from "next/script";
import dynamic from "next/dynamic";
import "./globals.css";
import "@smastrom/react-rating/style.css";
import { Toaster } from "@/components/ui/sonner";
import BottomNav from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import { PostHogProvider } from "@/providers/posthog-provider";
import { DomainProvider } from "@/providers/DomainProvider";
import type { DomainConfig } from "@/lib/domain-utils";

const AuthInitializer = dynamic(() => import("@/providers/AuthInitializer"));
const WhatsappGroupJoinAlertDialog = dynamic(() => import("@/components/WhatsappGroupJoinAlertDialog"));

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
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
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
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://us-assets.i.posthog.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://us.i.posthog.com" />
        <link rel="dns-prefetch" href="https://db.onlinewebfonts.com" />

        {/* SuisseIntl fonts — deferred to idle time to avoid blocking main thread */}
        <Script
          id="suisse-fonts-loader"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              var ids=['88f10bf18a36407ef36bf30bc25a3618?family=SuisseIntl-Regular',
               '03d5b20d124cd26dc873bd4a8e42313e?family=SuisseIntl-Light',
               '653d9381828e9577fb1e417dc047f89d?family=SuisseIntl-SemiBold',
               'd1a580023d40c546276decde1c711e60?family=SuisseIntl-Bold'];
              function loadFonts(){ids.forEach(function(id){
                var l=document.createElement('link');l.rel='stylesheet';
                l.href='https://db.onlinewebfonts.com/c/'+id;
                l.media='print';l.onload=function(){l.media='all'};
                document.head.appendChild(l);
              })}
              if(typeof requestIdleCallback!=='undefined'){requestIdleCallback(loadFonts)}
              else{setTimeout(loadFonts,2000)}
            `,
          }}
        />
        {/* Google Tag (gtag.js) — lazyOnload to avoid blocking main thread */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17905683217"
          strategy="lazyOnload"
        />
        <Script
          id="google-tag-manager"
          strategy="lazyOnload"
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
        {/* Apollo Tracking Script — lazyOnload to avoid blocking main thread */}
        <Script
          id="apollo-tracker"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");
o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,
o.onload=function(){window.trackingFunctions.onLoad({appId:"68f911e851e2250021bfaa60"})},
document.head.appendChild(o)}initApollo();`,
          }}
        />
      </head>
      <body
        className={`antialiased font-sans ${inter.variable} ${dancingScript.variable} ${poppins.variable} ${roboto.variable} ${geist.variable}`}
      >
        <PostHogProvider>
          <DomainProvider config={MENUTHERE_CONFIG}>
            <AuthInitializer />
            <WhatsappGroupJoinAlertDialog />
            <Toaster richColors closeButton position="top-center" />
            <Navbar />
            <main id="main-content">
              {children}
            </main>
            <BottomNav />
          </DomainProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
