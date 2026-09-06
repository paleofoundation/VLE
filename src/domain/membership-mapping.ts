import type { Role } from "./types";

export type OrganizationKind = "BUYER" | "SUPPLIER" | "PLATFORM";
export type MappableRole = Exclude<Role, "ADMIN">;

export function roleForOrganizationKind(kind: OrganizationKind): MappableRole {
  if (kind === "BUYER") return "BUYER";
  if (kind === "SUPPLIER") return "SUPPLIER";
  return "OPS";
}
