import { describe, expect, it } from "vitest";
import { assertPermission, assertTenant } from "../authz";

describe("server authorization", () => {
  const supplier = { userId: "u1", organizationId: "supplier-a", roles: ["SUPPLIER"] as const };
  it("allows a supplier to nominate for its own tenant", () => {
    expect(() => { assertPermission(supplier, "NOMINATE_LOT"); assertTenant(supplier, "supplier-a"); }).not.toThrow();
  });
  it("blocks cross-tenant supplier access", () => expect(() => assertTenant(supplier, "supplier-b")).toThrowError(/Cross-organization/));
  it("blocks buyers from compliance operations", () => expect(() => assertPermission({ userId: "u2", organizationId: "buyer", roles: ["BUYER"] }, "QUALIFY_LOT")).toThrowError(/not permitted/));
  it("keeps supplier artifacts under managed operations", () => {
    expect(() => assertPermission({ userId: "u3", organizationId: "platform", roles: ["OPS"] }, "MANAGE_LOT_ARTIFACTS")).not.toThrow();
    expect(() => assertPermission(supplier, "MANAGE_LOT_ARTIFACTS")).toThrowError(/not permitted/);
  });
  it("allows platform ops to work across supplier tenants", () => expect(() => assertTenant({ userId: "u3", organizationId: "platform", roles: ["OPS"] }, "supplier-a")).not.toThrow());
  it("reserves compliance profile versioning for admins", () => expect(() => assertPermission({ userId: "u3", organizationId: "platform", roles: ["OPS"] }, "MANAGE_PROFILES")).toThrowError(/not permitted/));
  it("keeps matching with ops and quote creation with suppliers", () => {
    expect(() => assertPermission({ userId: "u3", organizationId: "platform", roles: ["OPS"] }, "MANAGE_MATCHES")).not.toThrow();
    expect(() => assertPermission(supplier, "CREATE_QUOTE")).not.toThrow();
    expect(() => assertPermission(supplier, "CREATE_RESERVATION_INTENT")).toThrowError(/not permitted/);
  });
});
