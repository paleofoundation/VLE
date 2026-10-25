import {prepareResponseSecurity,protectResponse} from "../server/response-security.js";
import {guardMutationRequest} from "../server/abuse-budget.js";
import {deliverKasAccessNotifications} from '../server/kasandrinos-request-notifications.js';
import {deliverNotifications} from '../server/sourcing.js';
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, async () => {
      const security = prepareResponseSecurity(request);
      request = security.request;
      const guarded = await guardMutationRequest(request, env);
      if (guarded instanceof Response) return protectResponse(guarded,request,security.policy);
      request = guarded;
      const response = await handler.fetch(request, env, ctx);
      if (new URL(request.url).pathname.startsWith("/api/sourcing")) ctx.waitUntil(deliverNotifications(env.DB, env).catch(() => {}));
      if (["/api/tecrid-report-permissions", "/api/bootstrap"].includes(new URL(request.url).pathname)) ctx.waitUntil(deliverKasAccessNotifications(env.DB, env).catch(() => {}));
      return protectResponse(response,request,security.policy);
    });
  },
};

export default worker;
