import { MockTecridIssuer } from "./mock";
import type { TecridAdapter } from "./types";

export function getTecridAdapter(mockRecords = {}): TecridAdapter {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production TECRID transport is not approved or configured");
  }
  return new MockTecridIssuer(mockRecords);
}

export { HttpTecridAdapter, type TecridHttpContract } from "./http";
export type { TecridAdapter, TecridAuthenticationReceipt, TecridEvidenceEnvelope, TecridEvidenceStatusEnvelope, TecridRevocationNotice, TecridVerificationRequest } from "./types";
