import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://iqsea.io";

    return [
      {
        // CORS on all API routes — also handles OPTIONS preflight so the
        // browser never blocks a legitimate same-origin request.
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: origin,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            // Cache preflight for 10 min so browsers don't re-issue OPTIONS
            key: "Access-Control-Max-Age",
            value: "600",
          },
          {
            key: "Vary",
            value: "Origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
