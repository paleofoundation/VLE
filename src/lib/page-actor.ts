import "server-only";

import { redirect } from "next/navigation";
import { resolveCurrentAccess } from "./current-actor";

export async function getCurrentPageActor() {
  const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") redirect("/sign-in");
  if (access.status === "PENDING_MAPPING") redirect("/access");
  return access.actor;
}
