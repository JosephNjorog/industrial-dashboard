import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ ADD THIS
  allowedDevOrigins: [
    "10.10.117.168",
    "192.168.137.1"
  ],
};

export default nextConfig;
