import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addCompliancePackChecksum, COMPLIANCE_PACK_FORMAT, COMPLIANCE_PACK_VERSION } from "../compliance-pack";

describe("lot compliance pack envelope", () => {
  it("checksums exactly the pre-checksum payload", () => {
    const payload = { format: COMPLIANCE_PACK_FORMAT, formatVersion: COMPLIANCE_PACK_VERSION, physicalLot: { id: "lot-1" } };
    const pack = addCompliancePackChecksum(payload);
    expect(pack.checksum.payloadDigest).toBe(createHash("sha256").update(JSON.stringify(payload)).digest("hex"));
    expect(pack.checksum.limitation).toMatch(/not a digital signature/i);
  });

  it("changes the checksum when exported lot content changes", () => {
    const first = addCompliancePackChecksum({ physicalLot: { id: "lot-1", quantity: "1000" } });
    const second = addCompliancePackChecksum({ physicalLot: { id: "lot-1", quantity: "1001" } });
    expect(first.checksum.payloadDigest).not.toBe(second.checksum.payloadDigest);
  });
});
