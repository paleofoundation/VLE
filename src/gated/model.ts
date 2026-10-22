import type { Role } from "../domain/types";

export type Identity = { userId: string; organizationId: string };
export type Member = Identity & {
  roles: Role[];
  displayName: string;
  organizationName: string;
};
export type Eligibility = {
  id: string;
  organizationId: string;
  kind: "SUPPLIER" | "BRAND";
  status: "pending" | "approved" | "revoked";
  reviewer: string;
  reason: string;
  evidenceReference: string;
  decidedAt: number;
  validUntil: number;
};
export type Assignment = {
  id: string;
  supplierId: string;
  userId: string;
  assignedBy: string;
  authorizationReference: string;
  active: boolean;
};
export type Action = "view" | "download";
export type Version = {
  id: string;
  supplierId: string;
  subjectId: string;
  subject: "LOT" | "PROFILE";
  fileName: string;
  mediaType: string;
  objectKey: string;
  checksum: string;
  size: number;
  scan: "quarantine" | "clean" | "rejected";
  available: boolean;
  validUntil: number;
};
export type Invitation = {
  id: string;
  supplierId: string;
  issuerId: string;
  recipient: Identity;
  versions: string[];
  actions: Action[];
  digest: string;
  codeExpires: number;
  grantExpires: number;
  status: "issued" | "redeemed" | "cancelled" | "expired";
};
export type Grant = {
  id: string;
  invitationId: string;
  supplierId: string;
  recipient: Identity;
  versions: string[];
  actions: Action[];
  expires: number;
  revoked: boolean;
  revision: string;
};
export type Event = {
  id: string;
  at: number;
  supplierId: string | null;
  actor: Identity;
  organizationName: string;
  displayName: string;
  versionId?: string;
  invitationId?: string;
  grantId?: string;
  action: string;
  outcome: "allow" | "deny";
  reason: string;
  revision: string;
  correlation: string;
  previousHash: string | null;
  hash: string;
};
export type Attempt = { id: string; count: number; windowStart: number };
export type Subject = {
  id: string;
  subject: "LOT" | "PROFILE";
  supplierId: string;
};
export type State = {
  members: Member[];
  subjects: Subject[];
  eligibility: Eligibility[];
  assignments: Assignment[];
  versions: Version[];
  invitations: Invitation[];
  grants: Grant[];
  events: Event[];
  attempts: Attempt[];
};
export const emptyState = (): State => ({
  members: [],
  subjects: [],
  eligibility: [],
  assignments: [],
  versions: [],
  invitations: [],
  grants: [],
  events: [],
  attempts: [],
});

// Implementations must serialize policy decisions, mutations and audit commits.
// The callback works on an isolated snapshot. Throwing rolls back all writes.
export interface Repository {
  transaction<T>(work: (state: State) => Promise<T> | T): Promise<T>;
}
export interface PrivateStorage {
  putQuarantined(key: string, bytes: Uint8Array): Promise<void>;
  openSigned(
    key: string,
    expiresAt: number,
  ): Promise<ReadableStream<Uint8Array>>;
}
export interface Scanner {
  inspect(
    key: string,
    expectedMediaType: string,
    checksum: string,
  ): Promise<"clean" | "rejected">;
}
export type Policy = {
  revision: string;
  codeBytes: number;
  digestKey: string;
  attemptsPerWindow: number;
  attemptWindowMs: number;
  redemptionLifetimeMs: number;
  maxGrantLifetimeMs: number;
  signedUrlLifetimeMs: number;
  maxFileBytes: number;
  allowedMediaTypes: string[];
};
export const REVOCATION_NOTICE =
  "Revocation blocks later requests. Bytes already delivered and streams already started cannot be recalled. View access delivers bytes that can be copied.";
export class AccessDenied extends Error {
  constructor() {
    super("Access unavailable");
  }
}
