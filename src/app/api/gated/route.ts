import { createHandlers } from "@/gated/http";
import { loadPolicy } from "@/gated/policy";
import { gatedActor, gatedService } from "@/gated/runtime";
export const dynamic = "force-dynamic";
const handlers = createHandlers({
  actor: gatedActor,
  service: gatedService,
  maxBodyBytes: () => loadPolicy(process.env).maxFileBytes,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
// Avoid framework-generated HEAD responses invoking file delivery.
export async function HEAD() {
  const { deniedResponse } = await import("@/gated/http");
  return deniedResponse();
}
