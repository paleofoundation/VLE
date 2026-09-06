import { createHash } from "node:crypto";
import type { ResultValue } from "@/domain/types";
import type { TecridAdapter, TecridEvidenceEnvelope, TecridEvidenceStatusEnvelope, TecridVerificationRequest } from "./types";

export class MockTecridIssuer implements TecridAdapter {
  constructor(
    private readonly records: Record<string, { sampleCode: string; results: readonly ResultValue[] }>,
    private readonly now = () => new Date(),
  ) {}

  async verify(request: TecridVerificationRequest): Promise<TecridEvidenceEnvelope> {
    const record = this.records[request.tecridId];
    if (!record) throw new Error(`Mock TECRID ${request.tecridId} was not issued`);
    if (record.sampleCode !== request.expectedSampleCode) throw new Error("Mock TECRID sample binding does not match");
    const issuedAt = this.now();
    const expiresAt = new Date(issuedAt);
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    const payload = {
      contractVersion: "VLE_LOCAL_MOCK_V1",
      tecridId: request.tecridId,
      sampleCode: record.sampleCode,
      issuer: "VLE_LOCAL_MOCK_ISSUER",
      status: "CURRENT" as const,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      results: record.results,
    };
    return {
      ...payload,
      payloadHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
      authentication: {
        status: "VERIFIED",
        method: "LOCAL_MOCK_ONLY",
        keyId: null,
        verifiedAt: issuedAt.toISOString(),
      },
    };
  }

  async getStatus(tecridId: string): Promise<TecridEvidenceStatusEnvelope> {
    if (!this.records[tecridId]) throw new Error(`Mock TECRID ${tecridId} was not issued`);
    const checkedAt = this.now().toISOString();
    return {
      contractVersion: "VLE_LOCAL_MOCK_V1",
      tecridId,
      status: "CURRENT",
      checkedAt,
      revokedAt: null,
      revocationReason: null,
      authentication: { status: "VERIFIED", method: "LOCAL_MOCK_ONLY", keyId: null, verifiedAt: checkedAt },
    };
  }
}
