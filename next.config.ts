import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-to-png-converter", "pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    proxyClientMaxBodySize: "100mb",
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
