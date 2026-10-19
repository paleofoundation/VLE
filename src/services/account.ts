import "server-only";
import {randomUUID} from "node:crypto";
import {eq,sql} from "drizzle-orm";
import {getDb} from "@/db";
import {memberships,organizations,users} from "@/db/schema";
import {roleChoice} from "@/domain/account";
import {appendAuditEvent} from "./audit";
export async function chooseAccountRole(identity:{clerkUserId:string;email:string;displayName:string;verified:boolean},choice:unknown){const role=roleChoice.parse(choice);if(!identity.verified)throw new Error("Verify your email before continuing.");return getDb().transaction(async tx=>{await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${identity.clerkUserId}))`);const [u]=await tx.insert(users).values({clerkUserId:identity.clerkUserId,email:identity.email,displayName:identity.displayName}).onConflictDoUpdate({target:users.clerkUserId,set:{displayName:identity.displayName}}).returning();const existing=await tx.select().from(memberships).where(eq(memberships.userId,u.id));if(existing.length)return existing[0].role;const [org]=await tx.insert(organizations).values({name:identity.displayName,slug:`workspace-${randomUUID()}`,kind:role}).returning();await tx.insert(memberships).values({userId:u.id,organizationId:org.id,role});await appendAuditEvent(tx,{userId:u.id,organizationId:org.id,roles:[role]},{eventType:"ACCOUNT_ROLE_SELECTED",entityType:"Organization",entityId:org.id,data:{role}});return role;});}
