import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../src/db";
import { memberships, organizations, users } from "../src/db/schema";
import { appendAuditEvent } from "../src/services/audit";

const input = z.object({
  clerkUserId: z.string().trim().min(5),
}).parse({
  clerkUserId: process.env.VLE_BOOTSTRAP_OPS_CLERK_USER_ID,
});

async function bootstrap() {
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(input.clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(({ id }) => id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) throw new Error("Clerk bootstrap user has no email address");
  const email = primaryEmail.toLowerCase();
  const displayName = clerkUser.fullName?.trim() || clerkUser.username || primaryEmail;
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [alreadyMapped] = await tx.select({ user: users, membershipId: memberships.id }).from(users)
      .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.role, "OPS")))
      .innerJoin(organizations, and(eq(organizations.id, memberships.organizationId), eq(organizations.kind, "PLATFORM")))
      .where(eq(users.clerkUserId, input.clerkUserId)).limit(1);
    if (alreadyMapped) return { status: "ALREADY_MAPPED" as const, userId: alreadyMapped.user.id };

    const [[seededOps], [emailConflict], [clerkConflict]] = await Promise.all([
      tx.select().from(users).where(eq(users.clerkUserId, "seed_ops_replace_with_clerk_id")).limit(1),
      tx.select().from(users).where(eq(users.email, email)).limit(1),
      tx.select().from(users).where(eq(users.clerkUserId, input.clerkUserId)).limit(1),
    ]);
    if (!seededOps) throw new Error("Seeded OPS identity placeholder not found; bootstrap is closed");
    if (emailConflict && emailConflict.id !== seededOps.id) throw new Error("Bootstrap email already belongs to a different VLE user");
    if (clerkConflict && clerkConflict.id !== seededOps.id) throw new Error("Bootstrap Clerk ID already belongs to a different VLE user");
    const [opsMembership] = await tx.select({ id: memberships.id }).from(memberships)
      .innerJoin(organizations, and(eq(organizations.id, memberships.organizationId), eq(organizations.kind, "PLATFORM")))
      .where(and(eq(memberships.userId, seededOps.id), eq(memberships.role, "OPS"))).limit(1);
    if (!opsMembership) throw new Error("Seeded platform OPS membership not found; bootstrap is closed");

    const [user] = await tx.update(users).set({ clerkUserId: input.clerkUserId, email, displayName }).where(eq(users.id, seededOps.id)).returning();
    await appendAuditEvent(tx, null, {
      eventType: "CLERK_OPS_BOOTSTRAPPED",
      entityType: "Membership",
      entityId: opsMembership.id,
      data: { userId: user.id, clerkUserId: input.clerkUserId, organizationKind: "PLATFORM", role: "OPS" },
    });
    return { status: "MAPPED" as const, userId: user.id };
  });
  process.stdout.write(`VLE Clerk OPS bootstrap ${result.status}: ${result.userId}\n`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
