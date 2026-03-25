// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
      // Base Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Wildcard for any subdomains (like proxy-int.res.cloudinary.com)
      {
        protocol: "https",
        hostname: "**.res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;