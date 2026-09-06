import type { Role } from "./types";
import { DomainError } from "./errors";

export type Actor = {
  userId: string;
  organizationId: string;
  roles: readonly Role[];
};

const permissions = {
  NOMINATE_LOT: ["SUPPLIER", "ADMIN"],
  MANAGE_NOMINATIONS: ["OPS", "ADMIN"],
  MANAGE_MEMBERSHIPS: ["OPS", "ADMIN"],
  EXPORT_COMPLIANCE_PACK: ["OPS", "ADMIN"],
  MANAGE_LOT_ARTIFACTS: ["OPS", "ADMIN"],
  MANAGE_SAMPLING: ["OPS", "ADMIN"],
  INGEST_EVIDENCE: ["OPS", "ADMIN"],
  QUALIFY_LOT: ["OPS", "ADMIN"],
  PUBLISH_LISTING: ["OPS", "ADMIN"],
  HOLD_OR_REVOKE: ["OPS", "ADMIN"],
  MANAGE_PROFILES: ["ADMIN"],
  CREATE_REQUIREMENT: ["BUYER", "ADMIN"],
  MANAGE_MATCHES: ["OPS", "ADMIN"],
  CREATE_QUOTE: ["SUPPLIER", "OPS", "ADMIN"],
  RESPOND_TO_QUOTE: ["BUYER", "OPS", "ADMIN"],
  CREATE_RESERVATION_INTENT: ["BUYER", "OPS", "ADMIN"],
  CANCEL_RESERVATION_INTENT: ["BUYER", "SUPPLIER", "OPS", "ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;

export function assertPermission(actor: Actor, permission: Permission) {
  if (!permissions[permission].some((role) => actor.roles.includes(role))) {
    throw new DomainError(`Role is not permitted to ${permission}`, "FORBIDDEN");
  }
}

export function assertTenant(actor: Actor, organizationId: string) {
  if (actor.roles.includes("ADMIN") || actor.roles.includes("OPS")) return;
  if (actor.organizationId !== organizationId) {
    throw new DomainError("Cross-organization access denied", "TENANT_MISMATCH");
  }
}
