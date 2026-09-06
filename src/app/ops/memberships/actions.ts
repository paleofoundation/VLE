"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/domain/authz";
import { DomainError } from "@/domain/errors";
import { getClerkIdentity } from "@/lib/clerk-identity";
import { getCurrentActor } from "@/lib/current-actor";
import { mapClerkIdentity } from "@/services/memberships";

const mappingSchema = z.object({
  clerkUserId: z.string().trim().min(5).max(255),
  email: z.email().transform((value) => value.toLowerCase()),
  organizationId: z.string().uuid(),
});

export async function mapClerkMembershipAction(data: FormData) {
  const input = mappingSchema.parse({
    clerkUserId: data.get("clerkUserId"),
    email: data.get("email"),
    organizationId: data.get("organizationId"),
  });
  const actor = await getCurrentActor();
  assertPermission(actor, "MANAGE_MEMBERSHIPS");
  const identity = await getClerkIdentity(input.clerkUserId);
  if (identity.email !== input.email) throw new DomainError("Copied email does not match the Clerk user's primary email", "IDENTITY_MISMATCH");
  await mapClerkIdentity(actor, { ...identity, organizationId: input.organizationId });
  revalidatePath("/access");
  revalidatePath("/ops/memberships");
  redirect("/ops/memberships?mapped=1");
}
