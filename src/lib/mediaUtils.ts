export function isVideoUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.includes("video");
}

/**
 * Derives the thumbnail URL for a video banner.
 * Convention: video at `hotel_banners/xxx.mp4` has thumbnail at `hotel_banners/xxx_thumb.jpg`
 */
export function getVideoThumbnailUrl(videoUrl: string): string {
    if (!videoUrl) return "";
    const lastDot = videoUrl.lastIndexOf(".");
    if (lastDot === -1) return videoUrl;
    return videoUrl.substring(0, lastDot) + "_thumb.jpg";
}
