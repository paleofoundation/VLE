import { createHash } from "node:crypto";
import { desc, sql } from "drizzle-orm";
import { auditEvents } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import type { getDb } from "@/db";

type Db = Pick<ReturnType<typeof getDb>, "select" | "insert" | "execute">;

export async function appendAuditEvent(
  db: Db,
  actor: Actor | null,
  event: { eventType: string; entityType: string; entityId: string; data: unknown },
) {
  // Serialize the global hash chain inside the caller's transaction.
  await db.execute(sql`select pg_advisory_xact_lock(884103126)`);
  const [previous] = await db.select({ eventHash: auditEvents.eventHash }).from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(1);
  const createdAt = new Date();
  const payload = JSON.stringify({
    ...event,
    actorUserId: actor?.userId ?? null,
    actorOrganizationId: actor?.organizationId ?? null,
    previousHash: previous?.eventHash ?? null,
    createdAt: createdAt.toISOString(),
  });
  const eventHash = createHash("sha256").update(payload).digest("hex");
  await db.insert(auditEvents).values({
    actorUserId: actor?.userId,
    actorOrganizationId: actor?.organizationId,
    ...event,
    data: event.data,
    previousHash: previous?.eventHash,
    eventHash,
    createdAt,
  });
}
