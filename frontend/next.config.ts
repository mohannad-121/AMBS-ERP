import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  // Private item images use authenticated API routes, never Next's optimizer.
  // Keep this unused pattern-matching entry point closed in every environment.
  images: { unoptimized: true, localPatterns: [], remotePatterns: [] },
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Legacy native GET submissions may contain credentials. Never log login URLs.
  logging: { incomingRequests: { ignore: [/^\/login(?:\?|$)/] } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
