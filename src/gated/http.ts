import { z } from "zod";
import { AccessDenied, type Identity } from "./model";
import type { GatedService } from "./service";

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};
const id = z.string().uuid();
const actions = z.array(z.enum(["view", "download"]));
const identity = z.object({ userId: id, organizationId: id }).strict();
const schema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("issue"),
      recipient: identity,
      versions: z.array(id).nonempty(),
      actions: actions.nonempty(),
      codeExpires: z.number().finite(),
      grantExpires: z.number().finite(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("redeem"),
      invitationId: id,
      code: z.string(),
    })
    .strict(),
  z.object({ operation: z.literal("cancel"), invitationId: id }).strict(),
  z.object({ operation: z.literal("revoke"), invitationId: id }).strict(),
  z
    .object({
      operation: z.literal("narrow"),
      grantId: id,
      versions: z.array(id),
      actions,
      expires: z.number().finite(),
    })
    .strict(),
  z.object({ operation: z.literal("scan"), versionId: id }).strict(),
  z.object({ operation: z.literal("withdraw"), versionId: id }).strict(),
  z
    .object({
      operation: z.literal("eligibility"),
      organizationId: id,
      kind: z.enum(["SUPPLIER", "BRAND"]),
      status: z.enum(["pending", "approved", "revoked"]),
      reason: z.string().trim().min(1),
      evidenceReference: z.string().trim().min(1),
      validUntil: z.number().finite(),
    })
    .strict(),
  z
    .object({
      operation: z.literal("assignment"),
      supplierId: id,
      userId: id,
      authorizationReference: z.string().trim().min(1),
      active: z.boolean(),
    })
    .strict(),
]);
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: PRIVATE_HEADERS });
export const deniedResponse = () => reply({ error: "Access unavailable" }, 403);
export function createHandlers(deps: {
  actor: () => Promise<Identity>;
  service: () => GatedService;
  maxBodyBytes: () => number;
}) {
  return {
    async GET(request: Request) {
      try {
        const actor = await deps.actor();
        const service = deps.service();
        const q = new URL(request.url).searchParams;
        switch (q.get("operation")) {
          case "history": {
            const from = q.has("from")
              ? z.coerce.number().finite().parse(q.get("from"))
              : undefined;
            const until = q.has("until")
              ? z.coerce.number().finite().parse(q.get("until"))
              : undefined;
            return reply(
              await service.history(actor, {
                versionId: q.get("versionId") || undefined,
                userId: q.get("userId") || undefined,
                action: q.get("action") || undefined,
                outcome: q.get("outcome") || undefined,
                from,
                until,
              }),
            );
          }
          case "management":
            return reply(await service.management(actor));
          case "metadata":
            return reply(
              await service.metadata(actor, id.parse(q.get("versionId"))),
            );
          case "preview":
          case "content":
          case "download": {
            const operation = q.get("operation")!;
            const stream = await service.content(
              actor,
              id.parse(q.get("versionId")),
              operation === "download" ? "download" : "view",
              operation,
            );
            // Conservative safe rendering: never execute uploaded markup. Range
            // requests undergo this same authorization and receive a full body.
            return new Response(stream, {
              headers: {
                ...PRIVATE_HEADERS,
                "Content-Type": "application/octet-stream",
                "Content-Disposition": 'attachment; filename="document"',
                "Accept-Ranges": "none",
              },
            });
          }
          default:
            return deniedResponse();
        }
      } catch {
        return deniedResponse();
      }
    },
    async POST(request: Request) {
      try {
        if (request.headers.get("origin") !== new URL(request.url).origin)
          throw new AccessDenied();
        const actor = await deps.actor();
        const service = deps.service();
        const limit = deps.maxBodyBytes();
        if (!Number.isSafeInteger(limit) || limit <= 0 || !request.body)
          throw new AccessDenied();
        const chunks: Uint8Array[] = [];
        let size = 0;
        const reader = request.body.getReader();
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          if (size > limit) {
            await reader.cancel();
            throw new AccessDenied();
          }
          chunks.push(part.value);
        }
        const body = Buffer.concat(chunks);
        if (new URL(request.url).searchParams.get("operation") === "upload") {
          const q = new URL(request.url).searchParams;
          const input = z
            .object({
              subject: z.enum(["LOT", "PROFILE"]),
              subjectId: id,
              fileName: z.string().min(1),
              mediaType: z.string().min(1),
              validUntil: z.coerce.number().finite(),
            })
            .parse({
              subject: q.get("subject"),
              subjectId: q.get("subjectId"),
              fileName: request.headers.get("x-file-name"),
              mediaType: request.headers.get("content-type"),
              validUntil: q.get("validUntil"),
            });
          return reply(await service.upload(actor, input, body));
        }
        if (
          request.headers.get("content-type")?.split(";")[0] !==
          "application/json"
        )
          throw new AccessDenied();
        const input = schema.parse(JSON.parse(body.toString("utf8")));
        switch (input.operation) {
          case "issue":
            return reply(await service.issue(actor, input));
          case "redeem":
            return reply({
              grantId: await service.redeem(
                actor,
                input.invitationId,
                input.code,
              ),
            });
          case "cancel":
            await service.cancel(actor, input.invitationId);
            break;
          case "revoke":
            await service.revoke(actor, input.invitationId);
            break;
          case "narrow":
            await service.narrow(
              actor,
              input.grantId,
              input.versions,
              input.actions,
              input.expires,
            );
            break;
          case "scan":
            await service.scan(actor, input.versionId);
            break;
          case "withdraw":
            await service.withdraw(actor, input.versionId);
            break;
          case "eligibility":
            await service.recordEligibility(actor, input);
            break;
          case "assignment":
            await service.assignManager(
              actor,
              input.supplierId,
              input.userId,
              input.authorizationReference,
              input.active,
            );
            break;
        }
        return reply({ ok: true });
      } catch {
        return deniedResponse();
      }
    },
  };
}
