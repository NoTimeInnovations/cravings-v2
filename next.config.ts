import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    serverActions: {
      bodySizeLimit: '2mb'
    },
    scrollRestoration: false
  },
  allowedDevOrigins: ['192.168.20.6', 'localhost', '192.168.1.16'],

  images: {
    minimumCacheTTL: 60,
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
    ];
  },
};

export default nextConfig;