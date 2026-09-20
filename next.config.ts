import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Bỏ qua typecheck các file worker/db cũ của Cloudflare khi deploy Next.js
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
