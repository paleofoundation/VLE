import type { NextConfig } from "next";
import { publicRobotsHeaders, wwwToApexRedirects } from "./src/lib/site";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/join",
        statusCode: 301,
      },
      ...wwwToApexRedirects(),
    ];
  },
  async headers() {
    return publicRobotsHeaders();
  },
};

export default nextConfig;
