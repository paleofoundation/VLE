import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
  contaminantDocuments,
  organizations,
  physicalLots,
} from "../../db/schema";
import {
  listLotContaminantDocuments,
  listSupplierContaminantDesk,
  getPublicSupplierProfile,
} from "../../services/contaminants";
import { exportLotCompliancePack } from "../../services/compliance-pack";
import { PUBLIC_SITEMAP_PATHS } from "../../lib/site";

const fake = vi.hoisted(() => ({ db: {} as object, queries: [] as string[] }));
vi.mock("../../db", () => ({ getDb: () => fake.db }));
// FAKE query harness executes the actual service projection and checks the
// generated Drizzle predicate against an intentionally mixed PUBLIC/GATED input.
const records = [
  {
    id: "FAKE-public",
    visibility: "PUBLIC",
    fileName: "FAKE-public.txt",
    referenceUrl: "https://fake.invalid/public",
    documentationType: "PFAS",
  },
  {
    id: "FAKE-private",
    visibility: "GATED",
    fileName: "FAKE-SECRET.txt",
    referenceUrl: "https://fake.invalid/SECRET",
    notes: "FAKE-SECRET",
    documentationType: "PFAS",
  },
  {
    id: "FAKE-unknown",
    visibility: null,
    fileName: "FAKE-SECRET-unknown.txt",
    referenceUrl: "https://fake.invalid/SECRET",
  },
];
beforeEach(() => {
  fake.queries = [];
  fake.db = {
    select(selection?: Record<string, unknown>) {
      let table: unknown;
      let predicate: SQL | undefined;
      const chain = {
        from(t: unknown) {
          table = t;
          return chain;
        },
        innerJoin() {
          return chain;
        },
        leftJoin() {
          return chain;
        },
        where(p: SQL) {
          predicate = p;
          return chain;
        },
        orderBy() {
          return chain;
        },
        limit() {
          return chain;
        },
        then(resolve: (rows: unknown[]) => unknown) {
          if (table === contaminantDocuments) {
            const query = predicate
              ? new PgDialect().sqlToQuery(predicate)
              : { sql: "", params: [] };
            fake.queries.push(query.sql);
            const filtered =
              query.sql.includes('"contaminant_documents"."visibility" =') &&
              query.params.includes("PUBLIC");
            return Promise.resolve(
              records
                .filter((r) => !filtered || r.visibility === "PUBLIC")
                .map((r) =>
                  Object.fromEntries(
                    Object.keys(selection ?? r).map((key) => [
                      key,
                      r[key as keyof typeof r],
                    ]),
                  ),
                ),
            ).then(resolve);
          }
          if (table === organizations)
            return Promise.resolve([
              { id: "FAKE-supplier", name: "FAKE supplier", slug: "fake" },
            ]).then(resolve);
          if (table === physicalLots && selection && "lot" in selection)
            return Promise.resolve([
              {
                lot: {
                  id: "FAKE-lot",
                  supplierOrganizationId: "FAKE-supplier",
                  productTypeId: "FAKE-product",
                },
                supplierName: "FAKE supplier",
                supplierSlug: "fake",
                productName: "FAKE product",
                productCode: "FAKE",
              },
            ]).then(resolve);
          return Promise.resolve([]).then(resolve);
        },
      };
      return chain;
    },
  };
});
it("excludes gated records from public supplier projections and metadata inputs", async () => {
  const profile = await getPublicSupplierProfile("fake");
  expect(profile?.documents).toHaveLength(1);
  expect(JSON.stringify(profile)).not.toContain("SECRET");
  expect(fake.queries).toHaveLength(1);
});
it("excludes gated and unknown records from lot views", async () => {
  const docs = await listLotContaminantDocuments("FAKE-lot");
  expect(docs).toHaveLength(1);
  expect(JSON.stringify(docs)).not.toContain("SECRET");
});
it("supplier's legacy desk cannot bypass the gated metadata policy", async () => {
  const desk = await listSupplierContaminantDesk({
    userId: "FAKE-user",
    organizationId: "FAKE-supplier",
    roles: ["SUPPLIER"],
  });
  expect(desk.documents).toHaveLength(1);
  expect(JSON.stringify(desk)).not.toContain("SECRET");
});
it("OPS and ADMIN compliance exports omit gated records and their references", async () => {
  for (const role of ["OPS", "ADMIN"] as const) {
    const pack = await exportLotCompliancePack(
      { userId: "FAKE-user", organizationId: "FAKE-platform", roles: [role] },
      "FAKE-lot",
    );
    expect(pack.contaminantDocuments.records).toHaveLength(1);
    expect(JSON.stringify(pack)).not.toContain("SECRET");
  }
});
it("static sitemap does not enumerate private documents or private routes", () => {
  expect(
    PUBLIC_SITEMAP_PATHS.some((path) => String(path).includes("gated")),
  ).toBe(false);
  expect(JSON.stringify(PUBLIC_SITEMAP_PATHS)).not.toContain("SECRET");
});
