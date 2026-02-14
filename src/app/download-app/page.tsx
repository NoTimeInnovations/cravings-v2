import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Monitor } from "lucide-react";

async function getWindowsDownloadUrl() {
    try {
        const res = await fetch('https://api.github.com/repos/ab-h-i-n/cravings-software/releases/latest', {
            next: { revalidate: 3600 } // Cache for 1 hour
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
        <div className="min-h-screen bg-gradient-to-br from-[#C04812] to-[#82290A] pt-32 pb-20 px-6 sm:px-12 lg:px-24 flex flex-col items-center justify-center text-white relative overflow-hidden">

            {/* Background Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:linear-gradient(to_bottom,black_90%,transparent_100%)] pointer-events-none" />

            <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
                {/* Left Content */}
                <div className="space-y-8 text-center lg:text-left">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4">
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </Link>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                        Menuthere for <br />
                        <span className="text-orange-200">Mobile & Desktop</span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/90 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                        Manage your restaurant on the go or from your desk. Get real-time order notifications, update your menu, and track sales across all devices.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start flex-wrap">
                        {/* App Store Button */}
                        <Link href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform duration-300 min-w-[190px]">
                            <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.48C2.7 15.25 3.51 7.59 10.2 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.89 3.51-.84 1.54.06 2.68.75 3.37 1.9-3 1.91-2.47 5.86.58 7.35-.61 1.75-1.53 3.07-2.69 4.08h-.01zM13 6.6c.14-1.8 1.48-3.37 2.96-3.6.43 2.27-2.3 3.96-2.96 3.6z" />
                            </svg>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Download on the</span>
                                <span className="text-xl font-bold">App Store</span>
                            </div>
                        </Link>

                        {/* Play Store Button */}
                        <Link href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform duration-300 min-w-[190px]">
                            <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                                <path d="M3,20.5V3.5C3,2.91,3.34,2.39,3.84,2.15L13.69,12L3.84,21.85C3.34,21.6,3,21.09,3,20.5M16.81,15.12L6.05,21.34L14.54,12.85M16.81,8.88L14.54,11.15L6.05,2.66M18.59,10.59L19.53,11.13C20.1,11.45 20.1,12.55 19.53,12.87L18.59,13.41L15.39,12L18.59,10.59Z" />
                            </svg>
                            <div className="flex flex-col items-start leading-none ml-1">
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Get it on</span>
                                <span className="text-xl font-bold">Google Play</span>
                            </div>
                        </Link>

                        {/* Windows Download Button */}
                        {windowsDownloadUrl && (
                            <Link
                                href={windowsDownloadUrl}
                                className="inline-flex items-center gap-3 bg-[#0078D4] text-white px-5 py-3 rounded-xl hover:bg-[#006cbd] transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform duration-300 min-w-[190px]"
                            >
                                <Monitor className="w-8 h-8" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Download for</span>
                                    <span className="text-xl font-bold">Windows</span>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Right Image */}
                <div className="relative flex justify-center items-center mt-12 lg:mt-0">
                    <div className="relative w-full flex justify-center items-center z-20">
                        <Image
                            src="/hero-image.png"
                            alt="Menuthere App Interface"
                            width={1400}
                            height={1600}
                            priority
                            className="w-full max-w-[600px] h-auto drop-shadow-2xl"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
