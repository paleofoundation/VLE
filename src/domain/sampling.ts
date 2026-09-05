import { DomainError } from "./errors";
import type { SamplingStatus } from "./types";

const allowed: Record<SamplingStatus, readonly SamplingStatus[]> = {
  REQUESTED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["COLLECTED", "CANCELLED"],
  COLLECTED: ["SHIPPED"],
  SHIPPED: ["RECEIVED"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertSamplingTransition(from: SamplingStatus, to: SamplingStatus) {
  if (!allowed[from].includes(to)) {
    throw new DomainError(`Sampling order cannot transition from ${from} to ${to}`, "INVALID_TRANSITION");
  }
}
