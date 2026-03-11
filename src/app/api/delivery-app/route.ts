import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "NoTimeInnovations/menuthere-delivery-app";

export const dynamic = "force-dynamic";

export async function GET() {
    if (!GITHUB_TOKEN) {
        return NextResponse.json(
            { error: "GitHub token not configured" },
            { status: 500 }
        );
    }

    try {
        // Fetch latest release
        const releaseRes = await fetch(
            `https://api.github.com/repos/${REPO}/releases/latest`,
            {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json",
                },
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

        // Stream the APK from GitHub (private repo needs auth)
        const apkRes = await fetch(apkAsset.url, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/octet-stream",
            },
        });

        if (!apkRes.ok || !apkRes.body) {
            return NextResponse.json(
                { error: "Failed to download APK" },
                { status: 502 }
            );
        }

        // Pipe the GitHub response body stream directly to the client
        return new Response(apkRes.body, {
            headers: {
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Disposition": `attachment; filename="${apkAsset.name}"`,
                "Content-Length": String(apkAsset.size),
            },
        });
    } catch (error) {
        console.error("Error proxying APK download:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
