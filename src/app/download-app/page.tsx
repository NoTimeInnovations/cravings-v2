import React from "react";
import Link from "next/link";

import { Monitor } from "lucide-react";
import RestaurantMarquee from "@/components/international/RestaurantMarquee";
import StartFreeTrailSection from "@/components/home/StartFreeTrailSection";
import Footer from "@/components/Footer";
import Chatwoot from "@/components/Chatwoot";

async function getWindowsDownloadUrl() {
    try {
        const res = await fetch('https://api.github.com/repos/ab-h-i-n/cravings-software/releases/latest', {
            next: { revalidate: 3600 }
        });

        if (!res.ok) {
            console.error("Failed to fetch GitHub release:", res.statusText);
            return null;
        }

        const data = await res.json();
        const exeAsset = data.assets?.find((asset: any) => asset.name.endsWith('.exe'));

        return exeAsset ? exeAsset.browser_download_url : null;
    } catch (error) {
        console.error("Failed to fetch windows download url", error);
        return null;
    }
}

export default async function DownloadAppPage() {
    const windowsDownloadUrl = await getWindowsDownloadUrl();

    return (
        <div className="min-h-screen w-full bg-white geist-font">
            {/* Hero Section */}
            <section className="flex items-center justify-center px-5 pb-20 pt-32 md:pt-40 bg-[#fcfbf7]">
                <div className="w-full sm:max-w-[90%] md:max-w-[80%] lg:max-w-[75%] mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="text-center lg:text-left">
                        <h1 className="geist-font text-3xl sm:text-4xl md:text-[3.25rem] md:leading-[1.15] font-semibold text-stone-900 tracking-tight">
                            Menuthere for{" "}
                            <span className="text-stone-500">Mobile & Desktop.</span>
                        </h1>

                        <p className="geist-font text-lg text-stone-500 max-w-lg mx-auto lg:mx-0 mt-5 leading-relaxed">
                            Manage your restaurant on the go or from your desk. Get real-time order notifications, update your menu, and track sales across all devices.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-8 flex-wrap">
                            {/* App Store Button */}
                            <Link href="#" className="inline-flex items-center gap-3 bg-stone-900 text-white px-5 py-3 rounded-full hover:bg-stone-800 transition-colors">
                                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.48C2.7 15.25 3.51 7.59 10.2 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.89 3.51-.84 1.54.06 2.68.75 3.37 1.9-3 1.91-2.47 5.86.58 7.35-.61 1.75-1.53 3.07-2.69 4.08h-.01zM13 6.6c.14-1.8 1.48-3.37 2.96-3.6.43 2.27-2.3 3.96-2.96 3.6z" />
                                </svg>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase font-medium text-stone-400 tracking-wider">Download on the</span>
                                    <span className="text-base font-semibold">App Store</span>
                                </div>
                            </Link>

                            {/* Play Store Button */}
                            <Link href="#" className="inline-flex items-center gap-3 bg-stone-900 text-white px-5 py-3 rounded-full hover:bg-stone-800 transition-colors">
                                <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24">
                                    <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85M16.81,8.88L14.54,11.15L6.05,2.66M18.59,10.59L19.53,11.13C20.1,11.45 20.1,12.55 19.53,12.87L18.59,13.41L15.39,12L18.59,10.59Z" />
                                </svg>
                                <div className="flex flex-col items-start leading-none ml-1">
                                    <span className="text-[10px] uppercase font-medium text-stone-400 tracking-wider">Get it on</span>
                                    <span className="text-base font-semibold">Google Play</span>
                                </div>
                            </Link>

                            {/* Windows Download Button */}
                            {windowsDownloadUrl && (
                                <Link
                                    href={windowsDownloadUrl}
                                    className="inline-flex items-center gap-3 border border-stone-300 bg-transparent text-stone-800 px-5 py-3 rounded-full hover:bg-stone-100 transition-colors"
                                >
                                    <Monitor className="w-6 h-6" />
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[10px] uppercase font-medium text-stone-400 tracking-wider">Download for</span>
                                        <span className="text-base font-semibold">Windows</span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Right Image */}
                    <div className="relative flex justify-center items-center">
                        <img
                            src="/hero-image.png"
                            alt="Menuthere App Interface"
                            width={1400}
                            height={1600}
                            className="w-full max-w-[500px] h-auto drop-shadow-2xl"
                        />
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <RestaurantMarquee />

            {/* Divider */}
            <div className="w-full h-px bg-stone-200" />

            {/* CTA */}
            <StartFreeTrailSection />

            {/* Footer */}
            <Footer appName="Menuthere" />

            {/* Chat */}
            <Chatwoot />
        </div>
    );
}
