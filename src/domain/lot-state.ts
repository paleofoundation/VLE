import { DomainError } from "./errors";
import type { LotStatus } from "./types";

const terminal: readonly LotStatus[] = ["REVOKED", "TRANSFORMED", "DEPLETED"];
const regular: Record<LotStatus, readonly LotStatus[]> = {
  NOMINATED: ["SAMPLING", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED"],
  SAMPLING: ["EVIDENCE_RECEIVED", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED"],
  EVIDENCE_RECEIVED: ["QUALIFIED", "NOT_QUALIFIED", "INSUFFICIENT_EVIDENCE", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED"],
  QUALIFIED: ["HELD", "REVOKED", "TRANSFORMED", "DEPLETED"],
  NOT_QUALIFIED: ["EVIDENCE_RECEIVED", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED"],
  INSUFFICIENT_EVIDENCE: ["EVIDENCE_RECEIVED", "HELD", "REVOKED", "TRANSFORMED", "DEPLETED"],
  HELD: ["NOMINATED", "SAMPLING", "EVIDENCE_RECEIVED", "QUALIFIED", "NOT_QUALIFIED", "INSUFFICIENT_EVIDENCE", "REVOKED", "TRANSFORMED", "DEPLETED"],
  REVOKED: [], TRANSFORMED: [], DEPLETED: [],
};

export function assertLotTransition(from: LotStatus, to: LotStatus) {
  if (terminal.includes(from) || !regular[from].includes(to)) {
    throw new DomainError(`Physical lot cannot transition from ${from} to ${to}`, "INVALID_TRANSITION");
  }
}
