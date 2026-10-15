import "server-only";
import { getCurrentActor } from "../lib/current-actor";
import { AccessDenied, type Identity } from "./model";
import { loadPolicy } from "./policy";
import { postgresRepository } from "./postgres";
import { GatedService } from "./service";
import { unavailableScanner, unavailableStorage } from "./storage";

export async function gatedActor(): Promise<Identity> {
  if (process.env.VLE_DEV_ACTOR) throw new AccessDenied();
  const actor = await getCurrentActor();
  return { userId: actor.userId, organizationId: actor.organizationId };
}
export function gatedService() {
  return new GatedService(
    postgresRepository,
    unavailableStorage,
    unavailableScanner,
    loadPolicy(process.env),
  );
}
