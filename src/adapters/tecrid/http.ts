import type { TecridAdapter, TecridEvidenceEnvelope } from "./types";

/**
 * Contract-only production adapter. TECRID_BASE_URL must be supplied by TECRID;
 * VLE deliberately does not invent or default a production endpoint.
 */
export class HttpTecridAdapter implements TecridAdapter {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  async verify(tecridId: string): Promise<TecridEvidenceEnvelope> {
    const response = await fetch(`${this.baseUrl}/evidence/${encodeURIComponent(tecridId)}`, {
      headers: { authorization: `Bearer ${this.token}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`TECRID verification failed with ${response.status}`);
    return (await response.json()) as TecridEvidenceEnvelope;
  }
}
