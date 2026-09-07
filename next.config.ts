import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/join",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.vle.exchange" }],
        destination: "https://vle.exchange/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
