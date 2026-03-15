import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download Menuthere Delivery App",
  description:
    "Download the Menuthere Delivery App for Android. Manage deliveries, track orders in real-time, and streamline your restaurant delivery operations.",
  openGraph: {
    title: "Download Menuthere Delivery App",
    description:
      "Download the Menuthere Delivery App for Android. Manage deliveries, track orders in real-time, and streamline your restaurant delivery operations.",
    images: [
      {
        url: "/delivery_app_og.png",
        width: 2228,
        height: 1138,
        alt: "Menuthere Delivery App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Menuthere Delivery App",
    description:
      "Download the Menuthere Delivery App for Android. Manage deliveries, track orders in real-time, and streamline your restaurant delivery operations.",
    images: ["/delivery_app_og.png"],
  },
};

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="fixed w-full z-[60] top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <nav className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex justify-center h-14 items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/menuthere-logo-full-new.svg"
                alt="Menuthere"
                width={140}
                height={38}
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>
        </nav>
      </header>
      <div className="pt-14">{children}</div>
    </>
  );
}
