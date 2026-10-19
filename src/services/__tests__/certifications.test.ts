import { expect, it, vi } from "vitest";
vi.mock("@/db", () => ({ getDb: vi.fn(() => { throw new Error("Database must not be called for unauthorized actors"); }) }));
import { ownSupplierProfile, requireCertificationAdmin } from "../certifications";
const actor = { userId: "u", organizationId: "o", roles: ["BUYER"] as const };
it("rejects brands from supplier certification editing before any database read", async () => { await expect(ownSupplierProfile(actor)).rejects.toThrow("Supplier access required"); });
it("requires operations authority for issuing-body confirmations", () => { expect(() => requireCertificationAdmin({ ...actor, roles: ["SUPPLIER"] })).toThrow(); expect(() => requireCertificationAdmin({ ...actor, roles: ["OPS"] })).not.toThrow(); });
