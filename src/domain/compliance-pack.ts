import { createHash } from "node:crypto";

export const COMPLIANCE_PACK_FORMAT = "VLE_LOT_COMPLIANCE_PACK";
export const COMPLIANCE_PACK_VERSION = "1.0";

export function addCompliancePackChecksum<T extends object>(payload: T) {
  const payloadDigest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return {
    ...payload,
    checksum: {
      algorithm: "SHA-256" as const,
      payloadDigest,
      scope: "UTF-8 JSON serialization of this pack before the checksum property is added",
      limitation: "Checksum only; this is not a digital signature or TECRID authentication.",
    },
  };
}
