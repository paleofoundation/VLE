import { z } from "zod";
import type { TecridAdapter, TecridEvidenceEnvelope, TecridEvidenceStatusEnvelope, TecridVerificationRequest } from "./types";

const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp");
const authenticationSchema = z.object({
  status: z.literal("VERIFIED"),
  method: z.string().min(1),
  keyId: z.string().min(1).nullable(),
  verifiedAt: timestamp,
}).strict();
const evidenceSchema = z.object({
  contractVersion: z.string().min(1),
  tecridId: z.string().min(1),
  sampleCode: z.string().min(1),
  issuer: z.string().min(1),
  status: z.literal("CURRENT"),
  issuedAt: timestamp,
  expiresAt: timestamp,
  results: z.array(z.object({
    analyte: z.enum(["lead", "cadmium", "arsenic", "mercury"]),
    valuePpm: z.number().finite().nonnegative(),
    unit: z.literal("ppm"),
  }).strict()),
  payloadHash: z.string().min(1),
  authentication: authenticationSchema,
}).strict();
const statusSchema = z.object({
  contractVersion: z.string().min(1),
  tecridId: z.string().min(1),
  status: z.enum(["CURRENT", "REVOKED"]),
  checkedAt: timestamp,
  revokedAt: timestamp.nullable(),
  revocationReason: z.string().min(1).nullable(),
  authentication: authenticationSchema,
}).strict();

/**
 * Transport details remain contract inputs: VLE supplies no default host, path,
 * authentication scheme, or credential. TECRID must approve each before use.
 */
export interface TecridHttpContract {
  evidenceUrl(tecridId: string): URL;
  statusUrl(tecridId: string): URL;
  authenticate(headers: Headers): void | Promise<void>;
}

/**
 * Production contract stub. It is deliberately absent from the runtime factory
 * until TECRID signs off the transport contract and sandbox checklist.
 */
export class HttpTecridAdapter implements TecridAdapter {
  constructor(
    private readonly contract: TecridHttpContract,
    private readonly request: typeof fetch = fetch,
    private readonly now = () => new Date(),
  ) {}

  private async getJson(url: URL) {
    const headers = new Headers({ accept: "application/json" });
    await this.contract.authenticate(headers);
    const response = await this.request(url, { headers, cache: "no-store" });
    if (!response.ok) throw new Error(`TECRID verification failed with ${response.status}`);
    return response.json();
  }

  async verify(request: TecridVerificationRequest): Promise<TecridEvidenceEnvelope> {
    const envelope = evidenceSchema.parse(await this.getJson(this.contract.evidenceUrl(request.tecridId)));
    if (envelope.tecridId !== request.tecridId) throw new Error("TECRID identifier binding does not match");
    if (envelope.sampleCode !== request.expectedSampleCode) throw new Error("TECRID sample binding does not match");
    if (new Date(envelope.expiresAt) <= this.now()) throw new Error("TECRID evidence is expired");
    return envelope;
  }

  async getStatus(tecridId: string): Promise<TecridEvidenceStatusEnvelope> {
    const status = statusSchema.parse(await this.getJson(this.contract.statusUrl(tecridId)));
    if (status.tecridId !== tecridId) throw new Error("TECRID status identifier binding does not match");
    if (status.status === "CURRENT" && (status.revokedAt || status.revocationReason)) throw new Error("TECRID current status contains revocation fields");
    if (status.status === "REVOKED" && !status.revokedAt) throw new Error("TECRID revoked status is missing revokedAt");
    return status;
  }
}
