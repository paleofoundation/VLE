export function isKasandrinosPreviewPath(pathname: string) {
  return pathname === "/preview/kasandrinos" || pathname.startsWith("/preview/kasandrinos/");
}

/** Preview deployments and local dev only. Production must not render these routes. */
export function kasandrinosPreviewEnabled(vercelEnv: string | undefined = process.env.VERCEL_ENV) {
  return vercelEnv !== "production";
}
