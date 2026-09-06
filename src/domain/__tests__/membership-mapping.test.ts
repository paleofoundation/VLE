import { describe, expect, it } from "vitest";
import { roleForOrganizationKind } from "../membership-mapping";

describe("Clerk identity membership mapping", () => {
  it.each([
    ["BUYER", "BUYER"],
    ["SUPPLIER", "SUPPLIER"],
    ["PLATFORM", "OPS"],
  ] as const)("maps %s organizations only to the modeled %s role", (kind, role) => {
    expect(roleForOrganizationKind(kind)).toBe(role);
  });
});
