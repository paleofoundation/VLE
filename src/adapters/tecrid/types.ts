import type { ResultValue } from "@/domain/types";

export type TecridVerificationRequest = {
  tecridId: string;
  expectedSampleCode: string;
};

export type TecridAuthenticationReceipt = {
  status: "VERIFIED";
  method: string;
  keyId: string | null;
  verifiedAt: string;
};

export type TecridEvidenceEnvelope = {
  contractVersion: string;
  tecridId: string;
  sampleCode: string;
  issuer: string;
  status: "CURRENT";
  issuedAt: string;
  expiresAt: string;
  results: readonly ResultValue[];
  payloadHash: string;
  authentication: TecridAuthenticationReceipt;
};

export type TecridEvidenceStatusEnvelope = {
  contractVersion: string;
  tecridId: string;
  status: "CURRENT" | "REVOKED";
  checkedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
  authentication: TecridAuthenticationReceipt;
};

export type TecridRevocationNotice = {
  contractVersion: string;
  eventId: string;
  eventType: "EVIDENCE_REVOKED";
  tecridId: string;
  revokedAt: string;
  revocationReason: string | null;
  authentication: TecridAuthenticationReceipt;
};

export interface TecridAdapter {
  verify(request: TecridVerificationRequest): Promise<TecridEvidenceEnvelope>;
  getStatus(tecridId: string): Promise<TecridEvidenceStatusEnvelope>;
}
