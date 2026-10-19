import { expect, it } from "vitest";
import { assertSupplierRequestType, requestCanBeRead, requestCanBeAnswered } from "../supplier-requests";
const brand = { userId: "b", organizationId: "brand-1", roles: ["BUYER"] as const };
const supplier = { userId: "s", organizationId: "supplier-1", roles: ["SUPPLIER"] as const };
const request = { buyerOrganizationId: "brand-1", supplierOrganizationId: "supplier-1", type: "QUOTE" as const };
it("a brand cannot read another brand's requests", () => { expect(requestCanBeRead(brand, request)).toBe(true); expect(requestCanBeRead({ ...brand, organizationId: "brand-2" }, request)).toBe(false); });
it("only the addressed supplier can reply", () => { expect(requestCanBeAnswered(supplier, request)).toBe(true); expect(requestCanBeAnswered({ ...supplier, organizationId: "supplier-2" }, request)).toBe(false); expect(requestCanBeAnswered(brand, request)).toBe(false); });
it("non-members accept only VLE invitation requests", () => { for (const type of ["DOCUMENT", "SAMPLE", "QUOTE"] as const) expect(() => assertSupplierRequestType("PUBLIC_DOCUMENTS", type)).toThrow(); expect(() => assertSupplierRequestType("PUBLIC_DOCUMENTS", "INVITE_SUPPLIER")).not.toThrow(); expect(requestCanBeRead(supplier, { ...request, type: "INVITE_SUPPLIER" })).toBe(false); expect(requestCanBeAnswered(supplier, { ...request, type: "INVITE_SUPPLIER" })).toBe(false); });
