import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { assertPermission, type Actor } from "@/domain/authz";
import { DomainError } from "@/domain/errors";
import { roleForOrganizationKind } from "@/domain/membership-mapping";
import { appendAuditEvent } from "./audit";

export type ClerkMembershipInput = {
  clerkUserId: string;
  email: string;
  displayName: string;
  organizationId: string;
};

export async function listMembershipMappingData(actor: Actor) {
  assertPermission(actor, "MANAGE_MEMBERSHIPS");
  const db = getDb();
  const [organizationRows, mappingRows] = await Promise.all([
    db.select().from(organizations).orderBy(asc(organizations.kind), asc(organizations.name)),
    db.select({
      membershipId: memberships.id,
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      clerkUserId: users.clerkUserId,
      organizationName: organizations.name,
      organizationKind: organizations.kind,
      role: memberships.role,
      createdAt: memberships.createdAt,
    }).from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .orderBy(desc(memberships.createdAt)),
  ]);
  return {
    organizations: organizationRows.map((organization) => ({ ...organization, mappedRole: roleForOrganizationKind(organization.kind) })),
    mappings: mappingRows,
  };
}

export async function mapClerkIdentity(actor: Actor, input: ClerkMembershipInput) {
  assertPermission(actor, "MANAGE_MEMBERSHIPS");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [organization] = await tx.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1);
    if (!organization) throw new DomainError("Organization not found", "NOT_FOUND");
    const role = roleForOrganizationKind(organization.kind);

    const [[byClerk], [byEmail]] = await Promise.all([
      tx.select().from(users).where(eq(users.clerkUserId, input.clerkUserId)).limit(1),
      tx.select().from(users).where(eq(users.email, input.email)).limit(1),
    ]);
    if (byClerk && byEmail && byClerk.id !== byEmail.id) {
      throw new DomainError("Clerk user ID and email resolve to different VLE users", "IDENTITY_CONFLICT");
    }

    let user = byClerk ?? byEmail;
    if (user) {
      const [existingMembership] = await tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, user.id)).limit(1);
      if (existingMembership) throw new DomainError("Clerk identity already has a VLE organization membership", "MEMBERSHIP_EXISTS");
      const previousClerkUserId = user.clerkUserId;
      [user] = await tx.update(users).set({ clerkUserId: input.clerkUserId, email: input.email, displayName: input.displayName }).where(eq(users.id, user.id)).returning();
      if (previousClerkUserId !== input.clerkUserId) {
        await appendAuditEvent(tx, actor, { eventType: "CLERK_IDENTITY_LINKED", entityType: "User", entityId: user.id, data: { previousClerkUserId, clerkUserId: input.clerkUserId } });
      }
    } else {
      [user] = await tx.insert(users).values({ clerkUserId: input.clerkUserId, email: input.email, displayName: input.displayName }).returning();
    }

    const [membership] = await tx.insert(memberships).values({ userId: user.id, organizationId: organization.id, role }).returning();
    await appendAuditEvent(tx, actor, {
      eventType: "CLERK_MEMBERSHIP_MAPPED",
      entityType: "Membership",
      entityId: membership.id,
      data: { userId: user.id, clerkUserId: input.clerkUserId, organizationId: organization.id, role },
    });
    return { user, membership, organization, role };
  });
}
