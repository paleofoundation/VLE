import { createHash } from "node:crypto";
import type { ResultValue } from "@/domain/types";
import type { TecridAdapter, TecridEvidenceEnvelope } from "./types";

export class MockTecridIssuer implements TecridAdapter {
  constructor(
    private readonly records: Record<string, { sampleCode: string; results: readonly ResultValue[] }>,
    private readonly now = () => new Date(),
  ) {}

  async verify(tecridId: string): Promise<TecridEvidenceEnvelope> {
    const record = this.records[tecridId];
    if (!record) throw new Error(`Mock TECRID ${tecridId} was not issued`);
    const issuedAt = this.now();
    const expiresAt = new Date(issuedAt);
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
    const payload = {
      tecridId,
      sampleCode: record.sampleCode,
      issuer: "VLE_LOCAL_MOCK_ISSUER",
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      results: record.results,
    };
    return {
      ...payload,
      payloadHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
      verifiedAt: issuedAt.toISOString(),
    };
  }
}
