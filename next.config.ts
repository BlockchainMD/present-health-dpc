import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    remotePatterns: [
      // Google Cloud Storage — for AI-generated article featured images.
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/blog/:slug",
        destination: "/learn/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
