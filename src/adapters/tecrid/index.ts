import { HttpTecridAdapter } from "./http";
import { MockTecridIssuer } from "./mock";
import type { TecridAdapter } from "./types";

export function getTecridAdapter(mockRecords = {}): TecridAdapter {
  const baseUrl = process.env.TECRID_BASE_URL;
  const token = process.env.TECRID_API_TOKEN;
  if (baseUrl && token) return new HttpTecridAdapter(baseUrl, token);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Production TECRID adapter is not configured");
  }
  return new MockTecridIssuer(mockRecords);
}

export type { TecridAdapter, TecridEvidenceEnvelope } from "./types";
