import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Enable polling for Docker environments
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 800,       // Check for changes every 800ms
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;