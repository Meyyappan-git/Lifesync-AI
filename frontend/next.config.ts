import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL
      || (process.env.BACKEND_INTERNAL_HOSTPORT && `http://${process.env.BACKEND_INTERNAL_HOSTPORT}`)
      || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
