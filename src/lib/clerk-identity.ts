import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { DomainError } from "@/domain/errors";

export async function getClerkIdentity(clerkUserId: string) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(clerkUserId);
  const primaryEmail = user.emailAddresses.find(({ id }) => id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) throw new DomainError("Clerk user has no email address", "IDENTITY_INCOMPLETE");
  return {
    clerkUserId: user.id,
    email: primaryEmail.toLowerCase(),
    displayName: user.fullName?.trim() || user.username || primaryEmail,
  };
}
