// Stand-in for the workerd `cloudflare:workers` module when Next.js builds
// this app for Vercel. Vinext builds keep using the real workerd module.
const runtimeEnv = process.env as unknown as Cloudflare.Env;

export const env: Cloudflare.Env = new Proxy(runtimeEnv, {
  get(target, property, receiver) {
    if (property === "DB" || property === "BUCKET") return undefined;
    return Reflect.get(target, property, receiver);
  },
});
