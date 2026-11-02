import type { NextConfig } from "next";
import { retiredPublicRedirects } from "./server/retired-public-redirects.mjs";

const nextConfig: NextConfig = {
  async redirects() {
    // statusCode 301 is the permanent redirect. `permanent` is also set because
    // vinext 1.0.0-beta.5 ignores statusCode and would otherwise answer 307.
    const rules = retiredPublicRedirects.flatMap(({ source, destination }) =>
      [source, `${source}/`].map((path) => ({
        source: path,
        destination,
        permanent: true,
        statusCode: 301 as const,
      })),
    );
    return rules as Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>;
  },
};

export default nextConfig;
