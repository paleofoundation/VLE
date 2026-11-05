import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retiredPublicRedirects } from "./server/retired-public-redirects.mjs";

const cloudflareWorkersStub = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "server/cloudflare-workers-stub.ts",
);

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
    return rules as unknown as Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>;
  },
};

// Vercel sets VERCEL=1. Alias the workerd import only for that Next.js build
// so a vinext build on any other host still receives the real module.
if (process.env.VERCEL === "1") {
  nextConfig.turbopack = {
    resolveAlias: {
      "cloudflare:workers": "./server/cloudflare-workers-stub.ts",
    },
  };
  nextConfig.webpack = (config) => {
    config.plugins ??= [];
    config.plugins.push({ apply: aliasCloudflareWorkers });
    return config;
  };
}

// Webpack treats `cloudflare:` as a URI scheme, so resolve.alias never sees it.
// Rewrite the request to the stub before scheme handling. Turbopack uses resolveAlias.
function aliasCloudflareWorkers(compiler: {
  hooks: {
    normalModuleFactory: {
      tap: (name: string, hook: (factory: NormalModuleFactoryLike) => void) => void;
    };
  };
}) {
  compiler.hooks.normalModuleFactory.tap("CloudflareWorkersStub", (factory) => {
    factory.hooks.beforeResolve.tap("CloudflareWorkersStub", (resolveData) => {
      if (resolveData.request === "cloudflare:workers") {
        resolveData.request = cloudflareWorkersStub;
      }
    });
  });
}

interface NormalModuleFactoryLike {
  hooks: {
    beforeResolve: {
      tap: (name: string, hook: (data: { request: string }) => void) => void;
    };
  };
}

export default nextConfig;
