import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Prevent @imgly/background-removal from trying to import Node-only modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      'onnxruntime-node': path.resolve(__dirname, 'src/lib/emptyModule.ts'),
      'sharp': path.resolve(__dirname, 'src/lib/emptyModule.ts'),
    },
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    serverActions: {
      bodySizeLimit: '40mb'
    },
    scrollRestoration: false
  },
  allowedDevOrigins: ['192.168.20.6', 'localhost', '192.168.1.16'],

  images: {
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      }
    ],
  },
  async headers() {
    return [
      {
        source: "/.well-known/:file*",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      // Production build output only. Production chunk filenames carry a
      // CONTENT hash, so a changed file always gets a new URL and caching it for
      // a year is free.
      //
      // Turbopack's dev chunks do NOT work that way: the name is derived from
      // the module PATH and stays identical across edits
      // (src_components_hotelDetail_placeOrder_13b6dd97._.js keeps its name
      // whatever you change inside it). Serving those as `immutable` told the
      // browser to keep a year-old copy of a URL whose contents change on every
      // save, so it kept replaying an OUTDATED module graph and threw
      // "module factory is not available. It might have been deleted in an HMR
      // update." — an error that looks like a Turbopack bug, survives deleting
      // .next (it is in the BROWSER, not the server), and never reproduces in
      // `next build`. Dev gets no header, so Next's own no-cache default applies.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/(.*)",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
      {
        source: "/(.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff|woff2))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;