import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  },
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 0, // nie cachuj dynamicznych stron po stronie klienta
    },
  },
};

export default nextConfig;
