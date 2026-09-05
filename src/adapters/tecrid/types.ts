import type { ResultValue } from "@/domain/types";

export type TecridEvidenceEnvelope = {
  tecridId: string;
  sampleCode: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  results: readonly ResultValue[];
  payloadHash: string;
  verifiedAt: string;
};

export interface TecridAdapter {
  verify(tecridId: string): Promise<TecridEvidenceEnvelope>;
}
