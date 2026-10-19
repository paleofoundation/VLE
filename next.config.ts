import type { NextConfig } from "next";
import { publicRobotsHeaders, wwwToApexRedirects } from "./src/lib/site";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/for-suppliers",
        statusCode: 301,
      },
      ...[["/access", "/sign-in"], ["/find", "/suppliers"], ["/join", "/for-suppliers"], ["/buyer", "/dashboard/brand"], ["/supplier", "/dashboard/supplier"], ["/for-buyers", "/suppliers"]].map(([source, destination]) => ({source, destination, statusCode: 301 as const})),
      ...wwwToApexRedirects(),
    ];
  },
  async headers() {
    return publicRobotsHeaders();
  },
};

export default nextConfig;
