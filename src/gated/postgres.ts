import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  memberships,
  organizations,
  physicalLots,
  users,
  contaminantDocuments,
} from "../db/schema";
import { emptyState, type Repository, type State } from "./model";
import {
  gatedAssignments,
  gatedAttempts,
  gatedEligibility,
  gatedEvents,
  gatedGrants,
  gatedInvitations,
  gatedVersions,
} from "./schema";

export const postgresRepository: Repository = {
  async transaction<T>(work: (state: State) => Promise<T> | T): Promise<T> {
    return getDb().transaction(async (tx) => {
      // One shared lock serializes all policy decisions, redemption and audit chain
      // writes across instances. No process-local locking in the durable adapter.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('vle-gated-policy'))`,
      );
      // Current membership/subject writers must finish before this snapshot; their
      // later deletions cannot race an in-progress authorization decision.
      await tx.execute(
        sql`lock table memberships, users, organizations, physical_lots, contaminant_documents in share mode`,
      );
      const state = emptyState();
      const memberRows = await tx
        .select({
          userId: users.id,
          organizationId: organizations.id,
          role: memberships.role,
          displayName: users.displayName,
          organizationName: organizations.name,
        })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .innerJoin(
          organizations,
          eq(organizations.id, memberships.organizationId),
        );
      for (const row of memberRows) {
        const existing = state.members.find(
          (m) =>
            m.userId === row.userId && m.organizationId === row.organizationId,
        );
        if (existing) existing.roles.push(row.role);
        else state.members.push({ ...row, roles: [row.role] });
      }
      const lots = await tx
        .select({
          id: physicalLots.id,
          supplierId: physicalLots.supplierOrganizationId,
        })
        .from(physicalLots);
      state.subjects = lots.map((l) => ({ ...l, subject: "LOT" as const }));
      // A shared compliance profile has no supplier owner. A profile association
      // must already be explicitly attached by that supplier, never inferred.
      const profiles = await tx
        .select({
          id: contaminantDocuments.complianceProfileId,
          supplierId: contaminantDocuments.supplierOrganizationId,
        })
        .from(contaminantDocuments);
      for (const p of profiles)
        if (p.id)
          state.subjects.push({
            id: p.id,
            supplierId: p.supplierId,
            subject: "PROFILE",
          });
      state.eligibility = (
        await tx
          .select()
          .from(gatedEligibility)
          .orderBy(sql`sequence`)
      ).map((r) => r.payload);
      state.assignments = (await tx.select().from(gatedAssignments)).map(
        (r) => r.payload,
      );
      state.versions = (await tx.select().from(gatedVersions)).map(
        (r) => r.payload,
      );
      state.invitations = (await tx.select().from(gatedInvitations)).map(
        (r) => r.payload,
      );
      state.grants = (await tx.select().from(gatedGrants)).map(
        (r) => r.payload,
      );
      state.events = (
        await tx
          .select()
          .from(gatedEvents)
          .orderBy(sql`sequence`)
      ).map((r) => r.payload);
      state.attempts = (await tx.select().from(gatedAttempts)).map(
        (r) => r.payload,
      );
      const before = structuredClone(state);
      const result = await work(state);
      // Append-only decisions and events. Mutable authority rows are replaced
      // only under the same lock and their mutations have a committed event.
      for (const row of state.eligibility.slice(before.eligibility.length))
        await tx.insert(gatedEligibility).values({ id: row.id, payload: row });
      for (const row of state.assignments)
        if (
          JSON.stringify(row) !==
          JSON.stringify(before.assignments.find((v) => v.id === row.id))
        )
          await tx
            .insert(gatedAssignments)
            .values({ id: row.id, payload: row })
            .onConflictDoUpdate({
              target: gatedAssignments.id,
              set: { payload: row },
            });
      for (const row of state.versions)
        if (
          JSON.stringify(row) !==
          JSON.stringify(before.versions.find((v) => v.id === row.id))
        )
          await tx
            .insert(gatedVersions)
            .values({ id: row.id, payload: row })
            .onConflictDoUpdate({
              target: gatedVersions.id,
              set: { payload: row },
            });
      for (const row of state.invitations)
        if (
          JSON.stringify(row) !==
          JSON.stringify(before.invitations.find((v) => v.id === row.id))
        )
          await tx
            .insert(gatedInvitations)
            .values({ id: row.id, payload: row })
            .onConflictDoUpdate({
              target: gatedInvitations.id,
              set: { payload: row },
            });
      for (const row of state.grants)
        if (
          JSON.stringify(row) !==
          JSON.stringify(before.grants.find((v) => v.id === row.id))
        )
          await tx
            .insert(gatedGrants)
            .values({
              id: row.id,
              invitationId: row.invitationId,
              payload: row,
            })
            .onConflictDoUpdate({
              target: gatedGrants.id,
              set: { payload: row },
            });
      for (const row of state.attempts)
        if (
          JSON.stringify(row) !==
          JSON.stringify(before.attempts.find((v) => v.id === row.id))
        )
          await tx
            .insert(gatedAttempts)
            .values({ id: row.id, payload: row })
            .onConflictDoUpdate({
              target: gatedAttempts.id,
              set: { payload: row },
            });
      for (const row of state.events.slice(before.events.length))
        await tx.insert(gatedEvents).values({ id: row.id, payload: row });
      return result;
    });
  },
};
