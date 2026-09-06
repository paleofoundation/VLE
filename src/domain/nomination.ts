import { DomainError } from "./errors";
import type { LotStatus } from "./types";

export type NominationDraftState = {
  status: LotStatus;
  identityConfirmedAt: Date | null;
  quantityVerifiedAt: Date | null;
  locationVerifiedAt: Date | null;
  authorityToSellVerifiedAt: Date | null;
  hasSamplingOrder: boolean;
};

export function assertNominationDraftEditable(state: NominationDraftState) {
  if (state.status !== "NOMINATED") {
    throw new DomainError("Only a NOMINATED physical lot can be edited as a nomination draft", "INVALID_TRANSITION");
  }
  if (
    state.identityConfirmedAt ||
    state.quantityVerifiedAt ||
    state.locationVerifiedAt ||
    state.authorityToSellVerifiedAt ||
    state.hasSamplingOrder
  ) {
    throw new DomainError("A nomination draft cannot be edited after verification or sampling begins", "INVALID_TRANSITION");
  }
}
