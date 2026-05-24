import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 0, // nie cachuj dynamicznych stron po stronie klienta
    },
  },
};

export default nextConfig;
