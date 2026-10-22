import { AccessDenied, type PrivateStorage, type Scanner } from "./model";

export interface InternalSigner {
  // Trusted adapter binds opaque key to an immutable private object version.
  sign(key: string, expiresAt: number): Promise<string>;
}
export class SignedStreamingStorage implements PrivateStorage {
  constructor(
    private signer: InternalSigner,
    private upload: PrivateStorage["putQuarantined"],
    private fetcher: typeof fetch = fetch,
  ) {}
  putQuarantined(key: string, bytes: Uint8Array) {
    return this.upload(key, bytes);
  }
  async openSigned(key: string, expiresAt: number) {
    try {
      if (expiresAt <= Date.now()) throw new AccessDenied();
      const url = await this.signer.sign(key, expiresAt);
      if (new URL(url).protocol !== "https:") throw new AccessDenied();
      const response = await this.fetcher(url, {
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok || !response.body) throw new AccessDenied();
      // No upstream headers or URL are returned. Errors are deliberately generic.
      return response.body;
    } catch {
      throw new AccessDenied();
    }
  }
}
// No bucket, credentials, scanner or fallback fake is wired into the application.
export const unavailableStorage: PrivateStorage = {
  async putQuarantined() {
    throw new AccessDenied();
  },
  async openSigned() {
    throw new AccessDenied();
  },
};
export const unavailableScanner: Scanner = {
  async inspect() {
    throw new AccessDenied();
  },
};
