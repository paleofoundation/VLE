import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { DomainError } from "@/domain/errors";

export type CurrentAccess =
  | { status: "ACTIVE"; actor: Actor }
  | { status: "SIGNED_OUT" }
  | { status: "PENDING_MAPPING"; identity: { clerkUserId: string; email: string | null; displayName: string } };

async function actorForIdentity(identity: SQL): Promise<Actor | null> {
  const db = getDb();
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

  if (!rows.length) return null;

  const primary = rows[0];
  return {
    userId: primary.userId,
    organizationId: primary.organizationId,
    roles: rows.filter((row) => row.organizationId === primary.organizationId).map((row) => row.role),
  };
}

export async function resolveCurrentAccess(): Promise<CurrentAccess> {
  const devEmail = process.env.NODE_ENV !== "production" ? process.env.VLE_DEV_ACTOR : undefined;
  if (devEmail) {
    const actor = await actorForIdentity(eq(users.email, devEmail));
    if (!actor) throw new DomainError("VLE_DEV_ACTOR has no VLE organization membership", "NO_MEMBERSHIP");
    return { status: "ACTIVE", actor };
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { status: "SIGNED_OUT" };
  const actor = await actorForIdentity(eq(users.clerkUserId, clerkUserId));
  if (actor) return { status: "ACTIVE", actor };

  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses.find(({ id }) => id === clerkUser.primaryEmailAddressId)?.emailAddress
    ?? clerkUser?.emailAddresses[0]?.emailAddress
    ?? null;
  const displayName = clerkUser?.fullName?.trim() || clerkUser?.username || primaryEmail || "Signed-in Clerk user";
  return { status: "PENDING_MAPPING", identity: { clerkUserId, email: primaryEmail?.toLowerCase() ?? null, displayName } };
}

export async function getCurrentActor(): Promise<Actor> {
  const access = await resolveCurrentAccess();
  if (access.status === "ACTIVE") return access.actor;
  if (access.status === "SIGNED_OUT") throw new DomainError("Authentication required", "UNAUTHENTICATED");
  throw new DomainError("Authenticated Clerk user has no VLE organization membership", "NO_MEMBERSHIP");
}
