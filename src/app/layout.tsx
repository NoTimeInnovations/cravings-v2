// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Dancing_Script, Poppins, Roboto, Geist, Bricolage_Grotesque, Montserrat, Noto_Sans_Devanagari, Noto_Sans_Arabic, Noto_Sans_Malayalam, Noto_Sans_Tamil, Noto_Sans_Bengali, Noto_Sans_SC } from "next/font/google";
import Script from "next/script";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { headers } from "next/headers";
import { getLocale } from "@/lib/i18n/server";
import { dirOf } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import "./globals.css";
import "@smastrom/react-rating/style.css";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog";
import BottomNav from "@/components/BottomNav";
import DevModeSync from "@/components/DevModeSync";
import DisableZoom from "@/components/DisableZoom";
import OrderChannelInit from "@/components/OrderChannelInit";
import { Navbar } from "@/components/Navbar";
import { PostHogProvider } from "@/providers/posthog-provider";
import { DomainProvider } from "@/providers/DomainProvider";
import { PartnerGtm } from "@/components/storefront/PartnerGtm";
import type { DomainConfig } from "@/lib/domain-utils";

const AuthInitializer = dynamic(() => import("@/providers/AuthInitializer"));

const MENUTHERE_CONFIG: DomainConfig = {
  name: "Menuthere",
  title:
    "Menuthere | QR Code Digital Menu for Restaurants, Cafes & Hotels",
  description:
    "Create your QR code digital menu in minutes. Real-time updates, Google Business sync, dynamic offers & analytics",
  logo: "/menuthere-logo-new.png",
  icon: "/menuthere-logo-new.png",
  logowhite: "/menuthere-white.png",
  ogImage: "/og_image.png",
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const isStaging =
  siteUrl.includes("staging") ||
  siteUrl.includes("test.cravings") ||
  siteUrl.includes("vercel.app");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title:
    "Menuthere | QR Code Digital Menu for Restaurants, Cafes & Hotels",
  description:
    "Create your QR code digital menu in minutes. Real-time updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants, cafes & hotels.",
  icons: {
    icon: [
      { url: "/favicon_new.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon_new.ico", type: "image/x-icon" }],
    apple: [{ url: "/icon-192x192.png" }],
  },
  metadataBase: new URL("https://menuthere.com"),
  robots: isStaging
    ? { index: false, follow: false }
    : {
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
      "Menuthere | QR Code Digital Menu for Restaurants, Cafes & Hotels",
    description:
      "Create your QR code digital menu in minutes. Real-time updates, Google Business sync, dynamic offers & analytics. Trusted by 600+ restaurants, cafes & hotels.",
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
  weight: ["400", "500", "600", "700", "800"],
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
const bricolageGrotesque = Bricolage_Grotesque({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Latin-only families cover none of Devanagari or Arabic, so these carry the
// Hindi and Arabic text. globals.css points html[lang] at them.
const notoDevanagari = Noto_Sans_Devanagari({
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
});
const notoArabic = Noto_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  // preload:false on every script face below. These are only reached by an
  // html[lang] rule, so preloading them would make an English visitor download
  // five alphabets they will never render.
  preload: false,
});
const notoMalayalam = Noto_Sans_Malayalam({
  weight: ["400", "500", "600", "700"],
  subsets: ["malayalam"],
  variable: "--font-malayalam",
  display: "swap",
  preload: false,
});
const notoTamil = Noto_Sans_Tamil({
  weight: ["400", "500", "600", "700"],
  subsets: ["tamil"],
  variable: "--font-tamil",
  display: "swap",
  preload: false,
});
const notoBengali = Noto_Sans_Bengali({
  weight: ["400", "500", "600", "700"],
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
  preload: false,
});
// Simplified Chinese. next/font only exposes latin/latin-ext/cyrillic/vietnamese
// as `subsets` for this family — there is no selectable Han subset, because
// Google serves CJK as many unicode-range slices rather than one named subset.
// So the Han coverage cannot be guaranteed from here, and globals.css therefore
// lists real system CJK faces after this one. preload stays off: CJK is huge and
// is only ever reached by an html[lang="zh"] rule.
const notoSC = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-cjk",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isCustomDomain = headersList.get("x-is-custom-domain") === "1";
  // On a custom domain the proxy resolves the partner and forwards their GTM
  // container here, so partner GTM loads on every custom-domain page — including
  // /order & /bill and the other top-level routes that aren't under
  // [username]/layout. On the main domain this header is absent and the
  // [username]/layout handles storefront GTM instead.
  const partnerGtmId = headersList.get("x-partner-gtm");

  // Resolved once per request, here, so <html lang/dir> is correct in the FIRST
  // byte of HTML — no flash of English, and no layout flip after hydration.
  const locale = await getLocale();
  const dir = dirOf(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f97316" />
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
        className={`antialiased font-sans ${inter.variable} ${dancingScript.variable} ${poppins.variable} ${roboto.variable} ${geist.variable} ${bricolageGrotesque.variable} ${montserrat.variable} ${notoDevanagari.variable} ${notoArabic.variable} ${notoMalayalam.variable} ${notoTamil.variable} ${notoBengali.variable} ${notoSC.variable}`}
      >
        {/* Custom-domain partner GTM (covers /order, /bill & all top-level
            routes the [username] subtree layout can't reach). */}
        <PartnerGtm gtmId={partnerGtmId} />
        <PostHogProvider>
          <DomainProvider config={MENUTHERE_CONFIG}>
            <AuthInitializer />
            <Suspense fallback={null}>
              <DevModeSync />
            </Suspense>
            <DisableZoom />
            <OrderChannelInit />
<Toaster richColors closeButton position="top-center" visibleToasts={1} />
            {/* Backs confirmDialog()/promptDialog() — mounted once here so the
                imperative helpers work from any route without a provider. */}
            <ConfirmDialogHost />
            {/* Wraps the Navbar too, so the switcher and the page it changes
                share one locale — and so switching re-renders both at once. */}
            <LocaleProvider initialLocale={locale}>
              {!isCustomDomain && <Navbar />}
              <main id="main-content">
                {children}
              </main>
            </LocaleProvider>
            {!isCustomDomain && <BottomNav />}
          </DomainProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
