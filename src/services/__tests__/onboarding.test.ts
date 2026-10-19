import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), audit: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => ({ transaction: mocks.transaction }) }));
vi.mock("../audit", () => ({ appendAuditEvent: mocks.audit }));
import { completeOnboarding } from "../onboarding";
import { memberships, organizations, supplierProfiles, users } from "@/db/schema";
const identity = { clerkUserId: "clerk-local-test", email: "owner@example.test", displayName: "Owner", emailVerified: true };
const input = { role: "SUPPLIER", companyName: "Example ingredient company", website: "https://example.test", country: "Greece", companyRole: "Owner", categories: ["Olive oil"] };
beforeEach(() => vi.clearAllMocks());
it("rejects unverified identities before opening a transaction", async () => { await expect(completeOnboarding({ ...identity, emailVerified: false }, input)).rejects.toThrow(); expect(mocks.transaction).not.toHaveBeenCalled(); });
it("creates only the requested supplier role and a hidden profile in one transaction", async () => {
 const written = new Map();
 const tx = { execute: vi.fn(), select: () => ({ from: () => ({ innerJoin: () => ({ where: async () => [] }) }) }), insert: (table: unknown) => ({ values: (value: unknown) => { written.set(table, value); return { onConflictDoUpdate: () => ({ returning: async () => [{ id: "user-id" }] }), returning: async () => [{ id: "org-id" }] }; } }) };
 mocks.transaction.mockImplementation((fn) => fn(tx));
 expect(await completeOnboarding(identity, input)).toBe("/supplier");
 expect(written.get(users)).toMatchObject({ clerkUserId: identity.clerkUserId }); expect(written.get(organizations)).toMatchObject({ kind: "SUPPLIER" }); expect(written.get(memberships)).toMatchObject({ role: "SUPPLIER", companyRole: "Owner" }); expect(written.get(supplierProfiles)).toMatchObject({ hidden: true, organizationId: "org-id" }); expect(mocks.audit).toHaveBeenCalledOnce();
});
it("a repeat submission cannot add a new role", async () => {
 const insert = vi.fn(); mocks.transaction.mockImplementation((fn) => fn({ execute: vi.fn(), select: () => ({ from: () => ({ innerJoin: () => ({ where: async () => [{ role: "BUYER" }] }) }) }), insert }));
 expect(await completeOnboarding(identity, input)).toBe("/buyer"); expect(insert).not.toHaveBeenCalled();
});
