import "server-only";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { DomainError } from "@/domain/errors";

export async function getCurrentActor(): Promise<Actor> {
  const db = getDb();
  const devEmail = process.env.NODE_ENV !== "production" ? process.env.VLE_DEV_ACTOR : undefined;
  const { userId: clerkUserId } = await auth();

  const identity = clerkUserId
    ? eq(users.clerkUserId, clerkUserId)
    : devEmail
      ? eq(users.email, devEmail)
      : null;

  if (!identity) throw new DomainError("Authentication required", "UNAUTHENTICATED");

  const rows = await db
    .select({
      userId: users.id,
      organizationId: organizations.id,
      role: memberships.role,
    })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(organizations, and(eq(organizations.id, memberships.organizationId)))
    .where(identity);

  if (!rows.length) {
    throw new DomainError("Authenticated user has no VLE organization membership", "NO_MEMBERSHIP");
  }

  const primary = rows[0];
  return {
    userId: primary.userId,
    organizationId: primary.organizationId,
    roles: rows.filter((row) => row.organizationId === primary.organizationId).map((row) => row.role),
  };
}
