import { describe, expect, it } from "vitest";
import { HttpTecridAdapter, type TecridHttpContract } from "../http";
import { MockTecridIssuer } from "../mock";

const now = new Date("2026-09-06T00:00:00.000Z");
const authentication = {
  status: "VERIFIED" as const,
  method: "CONTRACT_TEST_ONLY",
  keyId: "sandbox-key-1",
  verifiedAt: now.toISOString(),
};

const contract: TecridHttpContract = {
  evidenceUrl: (tecridId) => new URL(`https://tecrid-contract.invalid/evidence/${tecridId}`),
  statusUrl: (tecridId) => new URL(`https://tecrid-contract.invalid/status/${tecridId}`),
  authenticate: (headers) => headers.set("authorization", "Contract test credential"),
};

function evidenceEnvelope(sampleCode = "SAMPLE-001") {
  return {
    contractVersion: "candidate-1",
    tecridId: "TECRID-001",
    sampleCode,
    issuer: "TECRID_SANDBOX_TEST",
    status: "CURRENT",
    issuedAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2027-09-01T00:00:00.000Z",
    results: [{ analyte: "cadmium", valuePpm: 0.04, unit: "ppm" }],
    payloadHash: "contract-test-digest",
    authentication,
  };
}

function adapterReturning(payload: unknown) {
  const request: typeof fetch = async (_input, init) => {
    expect(new Headers(init?.headers).get("authorization")).toBe("Contract test credential");
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  };
  return new HttpTecridAdapter(contract, request, () => now);
}

describe("TECRID production contract stub", () => {
  it("accepts a runtime-valid, current envelope bound to the expected sample", async () => {
    const envelope = await adapterReturning(evidenceEnvelope()).verify({ tecridId: "TECRID-001", expectedSampleCode: "SAMPLE-001" });
    expect(envelope.authentication.status).toBe("VERIFIED");
    expect(envelope.status).toBe("CURRENT");
  });

  it("fails closed when the returned sample binding differs", async () => {
    await expect(adapterReturning(evidenceEnvelope("SAMPLE-WRONG")).verify({ tecridId: "TECRID-001", expectedSampleCode: "SAMPLE-001" })).rejects.toThrow(/sample binding/i);
  });

  it("fails closed on a revoked envelope in the verification path", async () => {
    await expect(adapterReturning({ ...evidenceEnvelope(), status: "REVOKED" }).verify({ tecridId: "TECRID-001", expectedSampleCode: "SAMPLE-001" })).rejects.toThrow();
  });

  it("fails closed on unverifiable authentication metadata", async () => {
    await expect(adapterReturning({ ...evidenceEnvelope(), authentication: { ...authentication, status: "UNVERIFIED" } }).verify({ tecridId: "TECRID-001", expectedSampleCode: "SAMPLE-001" })).rejects.toThrow();
  });

  it("fails closed when authenticated evidence has expired", async () => {
    await expect(adapterReturning({ ...evidenceEnvelope(), expiresAt: "2026-09-05T00:00:00.000Z" }).verify({ tecridId: "TECRID-001", expectedSampleCode: "SAMPLE-001" })).rejects.toThrow(/expired/i);
  });

  it("accepts an authenticated revoked status only with a revocation time", async () => {
    const status = await adapterReturning({
      contractVersion: "candidate-1",
      tecridId: "TECRID-001",
      status: "REVOKED",
      checkedAt: now.toISOString(),
      revokedAt: now.toISOString(),
      revocationReason: "Sandbox revocation test",
      authentication,
    }).getStatus("TECRID-001");
    expect(status.status).toBe("REVOKED");
  });

  it("keeps local mock evidence explicitly non-production and sample-bound", async () => {
    const mock = new MockTecridIssuer({ "MOCK-001": { sampleCode: "SAMPLE-001", results: [] } }, () => now);
    const envelope = await mock.verify({ tecridId: "MOCK-001", expectedSampleCode: "SAMPLE-001" });
    expect(envelope.issuer).toBe("VLE_LOCAL_MOCK_ISSUER");
    expect(envelope.authentication.method).toBe("LOCAL_MOCK_ONLY");
    await expect(mock.verify({ tecridId: "MOCK-001", expectedSampleCode: "SAMPLE-WRONG" })).rejects.toThrow(/sample binding/i);
  });
});
