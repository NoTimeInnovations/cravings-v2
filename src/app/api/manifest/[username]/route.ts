import { fetchFromHasura } from "@/lib/hasuraClient";
import { NextRequest, NextResponse } from "next/server";

const getPartnerManifestQuery = `
  query GetPartnerManifest($username: String!) {
    partners(where: {username: {_eq: $username}}, limit: 1) {
      store_name
      store_banner
      theme
    }
  }
`;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    const { username } = await params;

    try {
        const result = await fetchFromHasura(getPartnerManifestQuery, { username });
        const partner = result?.partners?.[0];

        if (!partner) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const theme = partner.theme || {};
        const bgColor = theme.bg || "#ffffff";
        const accentColor = theme.accent || "#000000";

        const manifest = {
            name: partner.store_name || "Menuthere",
            short_name: partner.store_name || "Menuthere",
            description: `Menu of ${partner.store_name}`,
            start_url: `/${username}`,
            display: "standalone" as const,
            background_color: bgColor,
            theme_color: accentColor,
            icons: [
                ...(partner.store_banner
                    ? [{ src: partner.store_banner, sizes: "512x512", type: "image/png" }]
                    : []),
                { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
                { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
            ],
        };

        return NextResponse.json(manifest, {
            headers: {
                "Content-Type": "application/manifest+json",
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Error generating manifest:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
