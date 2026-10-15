import { jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type {
  Assignment,
  Attempt,
  Eligibility,
  Event,
  Grant,
  Invitation,
  Version,
} from "./model";

// Draft schema only. Identity bindings stay inside typed payloads and are checked
// against current memberships and subjects within the serialized transaction.
export const gatedEligibility = pgTable("gated_eligibility", {
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Eligibility>().notNull(),
});
export const gatedAssignments = pgTable("gated_assignments", {
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Assignment>().notNull(),
});
export const gatedVersions = pgTable("gated_versions", {
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Version>().notNull(),
});
export const gatedInvitations = pgTable("gated_invitations", {
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Invitation>().notNull(),
});
export const gatedGrants = pgTable(
  "gated_grants",
  {
    id: uuid("id").primaryKey(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => gatedInvitations.id),
    payload: jsonb("payload").$type<Grant>().notNull(),
  },
  (table) => [uniqueIndex("gated_grant_invitation_uq").on(table.invitationId)],
);
export const gatedEvents = pgTable("gated_events", {
  id: uuid("id").primaryKey(),
  payload: jsonb("payload").$type<Event>().notNull(),
});
export const gatedAttempts = pgTable("gated_attempts", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<Attempt>().notNull(),
});
