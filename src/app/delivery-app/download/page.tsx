"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type DownloadStatus = "idle" | "fetching-info" | "downloading" | "completed" | "error";

interface ReleaseInfo {
    version: string;
    name: string;
    fileName: string;
    size: number;
    downloadUrl: string;
    publishedAt: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function DownloadContent() {
    const searchParams = useSearchParams();
    const action = searchParams.get("action") || "download";

    const [status, setStatus] = useState<DownloadStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const fetchInfo = useCallback(async () => {
        setStatus("fetching-info");
        try {
            const res = await fetch("/api/delivery-app/info");
            if (!res.ok) throw new Error("Failed to fetch release info");
            const data = await res.json();
            setReleaseInfo(data);
            return data;
        } catch (err: any) {
            setError(err.message || "Failed to fetch release info");
            setStatus("error");
            return null;
        }
    }, []);

    const startDownload = useCallback(async (info: ReleaseInfo) => {
        setStatus("downloading");
        setProgress(0);

        try {
            const res = await fetch("/api/delivery-app");
            if (!res.ok) throw new Error("Download failed");

            const contentLength = info.size;
            const reader = res.body?.getReader();
            if (!reader) throw new Error("Stream not supported");

            const chunks: BlobPart[] = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (contentLength) {
                    setProgress(Math.min(Math.round((received / contentLength) * 100), 100));
                }
            }

            const blob = new Blob(chunks, { type: "application/vnd.android.package-archive" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = info.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(100);
            setStatus("completed");
        } catch (err: any) {
            setError(err.message || "Download failed");
            setStatus("error");
        }
    }, []);

    const handleCopyLink = useCallback((info: ReleaseInfo) => {
        const fullUrl = `${window.location.origin}${info.downloadUrl}`;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    const handleShareLink = useCallback((info: ReleaseInfo) => {
        const fullUrl = `${window.location.origin}${info.downloadUrl}`;
        if (navigator.share) {
            navigator.share({
                title: "Menuthere Delivery App",
                text: `Download Menuthere Delivery App ${info.version}`,
                url: fullUrl,
            });
        } else {
            navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, []);

    useEffect(() => {
        (async () => {
            const info = await fetchInfo();
            if (!info) return;

            if (action === "download") {
                startDownload(info);
            } else {
                setStatus("idle");
            }
        })();
    }, [action, fetchInfo, startDownload]);

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-stone-50 to-white flex items-center justify-center px-5 py-10">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] border border-stone-100 overflow-hidden">
                    {/* Header with app icon */}
                    <div className="px-8 pt-10 pb-6 text-center">
                        <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-gradient-to-br from-[#ea580c] to-[#dc4a04] rounded-2xl mb-5 shadow-[0_4px_16px_rgba(234,88,12,0.3)] dl-scaleIn">
                            <svg width="42" height="42" viewBox="0 0 263 262" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="78.1294" y="85.8118" width="37.7647" height="15.1059" rx="7.55294" fill="white"/>
                                <path d="M146.106 83.8663C146.106 80.0741 149.18 77 152.972 77H171.511C178.337 77 183.871 82.5335 183.871 89.3594C183.871 90.8762 182.641 92.1059 181.124 92.1059H153.659C149.488 92.1059 146.106 88.7243 146.106 84.5529V83.8663Z" fill="white"/>
                                <rect x="183.871" y="80.7764" width="41.5412" height="15.1059" rx="7.55294" transform="rotate(90 183.871 80.7764)" fill="white"/>
                                <path d="M180.689 109.274C184.233 112.129 184.793 117.316 181.939 120.86L152.579 157.318C149.963 160.567 145.208 161.08 141.959 158.463C138.71 155.847 138.197 151.092 140.814 147.843L171.035 110.316C173.413 107.362 177.736 106.896 180.689 109.274Z" fill="white"/>
                                <path d="M152.547 151.9C152.547 157.114 148.32 161.341 143.106 161.341L63.1704 161.341C58.999 161.341 55.6175 157.959 55.6175 153.788C55.6175 149.617 58.999 146.235 63.1704 146.235L146.882 146.235C150.011 146.235 152.547 148.771 152.547 151.9Z" fill="white"/>
                                <path d="M115.895 153.341C115.895 157.759 112.313 161.341 107.895 161.341L63.471 161.341C59.0527 161.341 55.471 157.759 55.471 153.341L55.471 129.212C55.471 117.061 65.3207 107.212 77.471 107.212L107.895 107.212C112.313 107.212 115.895 110.793 115.895 115.212L115.895 153.341Z" fill="white"/>
                                <path d="M183.871 138.682C196.385 138.683 206.529 148.828 206.529 161.342C206.529 173.855 196.385 184 183.871 184C171.357 184 161.212 173.856 161.212 161.342C161.212 148.827 171.357 138.682 183.871 138.682ZM183.87 153.788C179.699 153.788 176.317 157.17 176.317 161.342C176.318 165.513 179.699 168.894 183.87 168.894C188.041 168.894 191.424 165.513 191.424 161.342C191.424 157.17 188.041 153.788 183.87 153.788Z" fill="white"/>
                                <path d="M93.2358 138.682C105.75 138.683 115.894 148.828 115.894 161.342C115.894 173.855 105.75 184 93.2358 184C80.7218 184 70.5769 173.856 70.5767 161.342C70.5767 148.827 80.7217 138.682 93.2358 138.682ZM93.2349 153.788C89.0637 153.788 85.6821 157.17 85.6821 161.342C85.6823 165.513 89.0638 168.894 93.2349 168.894C97.4061 168.894 100.788 165.513 100.789 161.342C100.789 157.17 97.4062 153.788 93.2349 153.788Z" fill="white"/>
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Menuthere Delivery</h1>
                        {releaseInfo && (
                            <div className="flex items-center justify-center gap-2 mt-2 dl-fadeIn">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-[11px] font-medium text-stone-500 tracking-wide">
                                    v{releaseInfo.version}
                                </span>
                                <span className="text-stone-300">&middot;</span>
                                <span className="text-[13px] text-stone-400">{formatBytes(releaseInfo.size)}</span>
                            </div>
                        )}
                    </div>

                    {/* Content area */}
                    <div className="px-8 pb-8">

                        {/* Error */}
                        {status === "error" && (
                            <div className="text-center space-y-4 dl-fadeIn">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full">
                                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-stone-900">Something went wrong</p>
                                    <p className="text-xs text-stone-400 mt-1">{error}</p>
                                </div>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full h-11 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {/* Fetching Info */}
                        {status === "fetching-info" && (
                            <div className="flex flex-col items-center py-4 dl-fadeIn">
                                <div className="w-8 h-8 rounded-full border-[2.5px] border-stone-200 border-t-[#ea580c] animate-spin" />
                                <p className="text-xs text-stone-400 mt-4">Preparing download...</p>
                            </div>
                        )}

                        {/* Idle - Show Download, Share & Copy */}
                        {status === "idle" && releaseInfo && (
                            <div className="space-y-2.5 dl-fadeIn">
                                <button
                                    onClick={() => startDownload(releaseInfo)}
                                    className="w-full h-11 bg-[#ea580c] text-white text-sm font-medium rounded-xl hover:bg-[#c2410c] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download APK
                                </button>
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => handleShareLink(releaseInfo)}
                                        className="flex-1 h-11 bg-stone-50 text-stone-700 text-sm font-medium rounded-xl border border-stone-200 hover:bg-stone-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                        </svg>
                                        Share
                                    </button>
                                    <button
                                        onClick={() => handleCopyLink(releaseInfo)}
                                        className="flex-1 h-11 bg-stone-50 text-stone-700 text-sm font-medium rounded-xl border border-stone-200 hover:bg-stone-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {copied ? (
                                            <>
                                                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                                <span className="text-emerald-600">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                </svg>
                                                Copy Link
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Downloading */}
                        {status === "downloading" && (
                            <div className="space-y-5 dl-fadeIn">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
                                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-orange-100">
                                        <svg className="w-4 h-4 text-[#ea580c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-stone-800 truncate">{releaseInfo?.fileName}</p>
                                        <p className="text-[11px] text-stone-400 mt-0.5">
                                            {releaseInfo ? formatBytes(Math.round((progress / 100) * releaseInfo.size)) : "..."} of {releaseInfo ? formatBytes(releaseInfo.size) : "..."}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-[#ea580c] tabular-nums">{progress}%</span>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                                        style={{
                                            width: `${progress}%`,
                                            background: "linear-gradient(90deg, #ea580c, #f97316)",
                                        }}
                                    >
                                        <div className="absolute inset-0 dl-shimmer" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Completed */}
                        {status === "completed" && releaseInfo && (
                            <div className="space-y-5 dl-fadeIn">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-emerald-100">
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-stone-800">Download complete</p>
                                        <p className="text-[11px] text-stone-400 mt-0.5">Check your downloads folder to install</p>
                                    </div>
                                </div>

                                <div className="pt-1 space-y-2.5">
                                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Share with your team</p>
                                    <button
                                        onClick={() => handleShareLink(releaseInfo)}
                                        className="w-full h-11 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                        </svg>
                                        Share
                                    </button>
                                    <button
                                        onClick={() => handleCopyLink(releaseInfo)}
                                        className="w-full h-11 bg-stone-50 text-stone-700 text-sm font-medium rounded-xl border border-stone-200 hover:bg-stone-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {copied ? (
                                            <>
                                                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                                <span className="text-emerald-600">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                </svg>
                                                Copy Link
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-stone-300 mt-6">
                    Menuthere &middot; NoTime Innovations
                </p>
            </div>

            <style jsx>{`
                @keyframes dlFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes dlScaleIn {
                    from { opacity: 0; transform: scale(0.85); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes dlShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .dl-fadeIn {
                    animation: dlFadeIn 0.4s ease-out;
                }
                .dl-scaleIn {
                    animation: dlScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .dl-shimmer {
                    animation: dlShimmer 1.5s infinite;
                }
            `}</style>
        </div>
    );
}

export default function DeliveryAppDownloadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-[2.5px] border-stone-200 border-t-[#ea580c] animate-spin" />
            </div>
        }>
            <DownloadContent />
        </Suspense>
    );
}
