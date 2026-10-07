import type { NextConfig } from "next";

// Use default Next.js behavior: it will automatically detect `src/app`
// so we don't need to configure a custom srcDir.
const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
