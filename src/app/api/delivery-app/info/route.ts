import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "NoTimeInnovations/menuthere-delivery-app";

export async function GET() {
    if (!GITHUB_TOKEN) {
        return NextResponse.json(
            { error: "GitHub token not configured" },
            { status: 500 }
        );
    }

    try {
        const releaseRes = await fetch(
            `https://api.github.com/repos/${REPO}/releases/latest`,
            {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json",
                },
                next: { revalidate: 300 },
            }
        );

        if (!releaseRes.ok) {
            return NextResponse.json(
                { error: "Failed to fetch release" },
                { status: 502 }
            );
        }

        const release = await releaseRes.json();
        const apkAsset = release.assets?.find((a: any) =>
            a.name.endsWith(".apk")
        );

        if (!apkAsset) {
            return NextResponse.json(
                { error: "No APK found in latest release" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            version: release.tag_name,
            name: release.name,
            fileName: apkAsset.name,
            size: apkAsset.size,
            downloadUrl: "/api/delivery-app",
            publishedAt: release.published_at,
        });
    } catch (error) {
        console.error("Error fetching release info:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
