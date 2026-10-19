import "server-only";
import { and, eq, inArray, ne, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { supplierRequests, supplierRequestReplies, supplierProfiles, physicalLots, organizations } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { supplierRequestSchema, assertSupplierRequestType, requestCanBeAnswered } from "@/domain/supplier-requests";
import { appendAuditEvent } from "./audit";
export async function createSupplierRequest(actor: Actor, input: unknown) {
  if (!actor.roles.includes("BUYER")) throw new Error("A brand account is required to send requests");
  const data = supplierRequestSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const profile = await tx.query.supplierProfiles.findFirst({ where: and(eq(supplierProfiles.id, data.supplierProfileId), eq(supplierProfiles.hidden, false)) });
    if (!profile) throw new Error("Supplier is unavailable");
    assertSupplierRequestType(profile.listingSource, data.type);
    if (data.type !== "INVITE_SUPPLIER" && !profile.organizationId) throw new Error("Supplier account is unavailable");
    if (data.lotId) {
      const lot = await tx.query.physicalLots.findFirst({ where: eq(physicalLots.id, data.lotId) });
      if (!lot || lot.supplierOrganizationId !== profile.organizationId || data.type === "INVITE_SUPPLIER") throw new Error("Lot does not belong to the requested supplier");
    }
    const [request] = await tx.insert(supplierRequests).values({ ...data, buyerOrganizationId: actor.organizationId }).returning();
    await appendAuditEvent(tx, actor, { eventType: "BRAND_REQUEST_CREATED", entityType: "supplier_request", entityId: request.id, data: { type: request.type, supplierProfileId: profile.id, routedTo: request.type === "INVITE_SUPPLIER" ? "VLE_OPERATIONS" : "SUPPLIER_INBOX" } });
    return request;
  });
}
export async function listSupplierRequests(actor: Actor, view: "BUYER" | "SUPPLIER" | "OPS") {
  if (view === "OPS" ? !actor.roles.some((r) => r === "OPS" || r === "ADMIN") : !actor.roles.includes(view)) throw new Error("Request inbox access denied");
  const where = view === "BUYER" ? eq(supplierRequests.buyerOrganizationId, actor.organizationId) : view === "SUPPLIER" ? and(eq(supplierProfiles.organizationId, actor.organizationId), ne(supplierRequests.type, "INVITE_SUPPLIER")) : undefined;
  const rows = await getDb().select({ request: supplierRequests, buyer: { displayName: organizations.name }, supplier: { displayName: supplierProfiles.displayName, organizationId: supplierProfiles.organizationId } }).from(supplierRequests).innerJoin(supplierProfiles, eq(supplierRequests.supplierProfileId, supplierProfiles.id)).innerJoin(organizations, eq(organizations.id, supplierRequests.buyerOrganizationId)).where(where).orderBy(desc(supplierRequests.createdAt));
  const replies = rows.length ? await getDb().select().from(supplierRequestReplies).where(inArray(supplierRequestReplies.requestId, rows.map((r) => r.request.id))) : [];
  return rows.map((row) => ({ ...row, replies: replies.filter((r) => r.requestId === row.request.id).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()) }));
}
export async function replyToSupplierRequest(actor: Actor, requestId: string, message: string) {
  if (message.trim().length < 2 || message.length > 4000) throw new Error("Enter a reply between 2 and 4000 characters");
  await getDb().transaction(async (tx) => {
    const [row] = await tx.select({ request: supplierRequests, supplierOrganizationId: supplierProfiles.organizationId }).from(supplierRequests).innerJoin(supplierProfiles, eq(supplierRequests.supplierProfileId, supplierProfiles.id)).where(eq(supplierRequests.id, requestId)).for("update");
    if (!row || !requestCanBeAnswered(actor, { ...row.request, supplierOrganizationId: row.supplierOrganizationId }) || row.request.status === "CLOSED") throw new Error("You cannot respond to this request");
    await tx.insert(supplierRequestReplies).values({ requestId, authorOrganizationId: actor.organizationId, authorUserId: actor.userId, message: message.trim() });
    await tx.update(supplierRequests).set({ status: "RESPONDED", updatedAt: new Date() }).where(eq(supplierRequests.id, requestId));
    await appendAuditEvent(tx, actor, { eventType: "BRAND_REQUEST_RESPONDED", entityType: "supplier_request", entityId: requestId, data: { status: "RESPONDED" } });
  });
}
export async function closeSupplierRequest(actor: Actor, requestId: string) {
  if (!actor.roles.includes("BUYER")) throw new Error("Brand account required");
  await getDb().transaction(async (tx) => {
    const [request] = await tx.update(supplierRequests).set({ status: "CLOSED", updatedAt: new Date() }).where(and(eq(supplierRequests.id, requestId), eq(supplierRequests.buyerOrganizationId, actor.organizationId))).returning();
    if (!request) throw new Error("Request unavailable");
    await appendAuditEvent(tx, actor, { eventType: "BRAND_REQUEST_CLOSED", entityType: "supplier_request", entityId: requestId, data: { status: "CLOSED" } });
  });
}
