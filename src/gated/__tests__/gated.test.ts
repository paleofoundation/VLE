import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AccessDenied } from "../model";
import { GatedService } from "../service";
import { loadPolicy } from "../policy";
import { createHandlers } from "../http";
import { SignedStreamingStorage } from "../storage";
import { fixture, TEST_ONLY_POLICY } from "./fixture";

const denied = (promise: Promise<unknown>) =>
  expect(promise).rejects.toThrow("Access unavailable");
describe("FAKE gated policy and lifecycle", () => {
  it("fails closed with no policy or any missing required policy key", () => {
    expect(() => loadPolicy({})).toThrow();
    const env = {
      GATED_POLICY_REVISION: "TEST-ONLY",
      GATED_CODE_DIGEST_KEY: "FAKE",
      GATED_CODE_BYTES: "32",
      GATED_ATTEMPTS_PER_WINDOW: "4",
      GATED_ATTEMPT_WINDOW_MS: "1000",
      GATED_REDEMPTION_LIFETIME_MS: "10000",
      GATED_MAX_GRANT_LIFETIME_MS: "20000",
      GATED_SIGNED_URL_LIFETIME_MS: "500",
      GATED_MAX_FILE_BYTES: "4096",
      GATED_ALLOWED_MEDIA_TYPES: "text/plain",
    };
    expect(loadPolicy(env).revision).toBe("TEST-ONLY");
    for (const key of Object.keys(env)) {
      const missing: Record<string, string> = { ...env };
      delete missing[key];
      expect(() => loadPolicy(missing)).toThrow();
    }
  });
  it("denies eligible users, owners and platform roles without a redeemed grant", async () => {
    const f = await fixture();
    for (const a of [f.buyer, f.owner, f.admin, f.other])
      await denied(f.service.metadata(a, f.id));
  });
  it("denies unmapped identities", async () => {
    const f = await fixture();
    await denied(
      f.service.metadata(
        { userId: randomUUID(), organizationId: f.buyer.organizationId },
        f.id,
      ),
    );
  });
  it("allows named approved brand access and stores no raw code", async () => {
    const f = await fixture();
    const g = await f.grant();
    expect(await f.service.metadata(f.buyer, f.id)).toMatchObject({
      fileName: "FAKE.txt",
    });
    expect(JSON.stringify(f.repo.state)).not.toContain(g.code);
    expect(
      await new Response(
        await f.service.content(f.buyer, f.id, "download"),
      ).text(),
    ).toBe("FAKE document");
  });
  it("allows verified supplier recipients", async () => {
    const f = await fixture();
    await f.grant(f.other);
    expect(await f.service.metadata(f.other, f.id)).toHaveProperty("id", f.id);
  });
  it("requires an audited self-addressed owner code", async () => {
    const f = await fixture();
    await f.grant(f.owner);
    expect(await f.service.metadata(f.owner, f.id)).toHaveProperty("id", f.id);
    expect(
      f.repo.state.events.some((e) => e.action === "owner-code-issued"),
    ).toBe(true);
  });
  it("denies wrong named user and organization without consuming code", async () => {
    const f = await fixture();
    const i = await f.issue();
    await denied(f.service.redeem(f.other, i.invitationId, i.code));
    await denied(
      f.service.redeem(
        { ...f.buyer, organizationId: f.owner.organizationId },
        i.invitationId,
        i.code,
      ),
    );
    expect(f.repo.state.grants).toHaveLength(0);
    await f.service.redeem(f.buyer, i.invitationId, i.code);
  });
  it("denies a wrong secret and returns the same unknown-invitation error", async () => {
    const f = await fixture();
    const i = await f.issue();
    await denied(f.service.redeem(f.buyer, i.invitationId, "wrong"));
    await denied(f.service.redeem(f.buyer, randomUUID(), "wrong"));
  });
  it("denies at code expiry and grant expiry boundaries", async () => {
    const f = await fixture();
    const i = await f.issue();
    f.advance(10000);
    await denied(f.service.redeem(f.buyer, i.invitationId, i.code));
    const g = await f.grant();
    f.advance(20000);
    await denied(f.service.metadata(f.buyer, f.id));
    expect(g.grantId).toBeTruthy();
  });
  it("denies cancelled and reused codes", async () => {
    const f = await fixture();
    const i = await f.issue();
    await f.service.cancel(f.owner, i.invitationId);
    await denied(f.service.redeem(f.buyer, i.invitationId, i.code));
    const g = await f.grant();
    await denied(f.service.redeem(f.buyer, g.invitationId, g.code));
  });
  it("commits one grant under concurrent redemption", async () => {
    const f = await fixture();
    const i = await f.issue();
    const results = await Promise.allSettled([
      f.service.redeem(f.buyer, i.invitationId, i.code),
      f.service.redeem(f.buyer, i.invitationId, i.code),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(f.repo.state.grants).toHaveLength(1);
    expect(
      f.repo.state.events.filter((e) => e.action === "code-redeemed"),
    ).toHaveLength(1);
  });
  it("durably throttles attempts across separate service requests", async () => {
    const f = await fixture();
    const i = await f.issue();
    for (let n = 0; n < TEST_ONLY_POLICY.attemptsPerWindow; n++)
      await denied(f.service.redeem(f.buyer, i.invitationId, "wrong"));
    await denied(f.service.redeem(f.buyer, i.invitationId, i.code));
    f.advance(TEST_ONLY_POLICY.attemptWindowMs);
    await f.service.redeem(f.buyer, i.invitationId, i.code);
  });
  it("checks issuer authority at redemption", async () => {
    const f = await fixture();
    const i = await f.issue();
    await f.service.assignManager(
      f.admin,
      f.owner.organizationId,
      f.owner.userId,
      "FAKE revoked authority",
      false,
    );
    await denied(f.service.redeem(f.buyer, i.invitationId, i.code));
  });
  it("issuer removal does not silently revoke redeemed grants", async () => {
    const f = await fixture();
    await f.grant();
    await f.service.assignManager(
      f.admin,
      f.owner.organizationId,
      f.owner.userId,
      "FAKE revoked authority",
      false,
    );
    expect(await f.service.metadata(f.buyer, f.id)).toHaveProperty("id", f.id);
  });
  it("revocation blocks the next metadata, view and download request", async () => {
    const f = await fixture();
    const g = await f.grant();
    await f.service.revoke(f.owner, g.invitationId);
    await denied(f.service.metadata(f.buyer, f.id));
    await denied(f.service.content(f.buyer, f.id, "view"));
    await denied(f.service.content(f.buyer, f.id, "download"));
  });
  it("membership removal and recipient eligibility revocation take effect immediately", async () => {
    const f = await fixture();
    await f.grant();
    const members = structuredClone(f.repo.state.members);
    f.repo.state.members = f.repo.state.members.filter(
      (m) => m.userId !== f.buyer.userId,
    );
    await denied(f.service.metadata(f.buyer, f.id));
    f.repo.state.members = members;
    await f.service.recordEligibility(f.admin, {
      organizationId: f.buyer.organizationId,
      kind: "BRAND",
      status: "revoked",
      reason: "FAKE",
      evidenceReference: "FAKE",
      validUntil: f.now() + 100000,
    });
    await denied(f.service.metadata(f.buyer, f.id));
  });
  it("owner eligibility revocation blocks an existing recipient grant", async () => {
    const f = await fixture();
    await f.grant();
    await f.service.recordEligibility(f.admin, {
      organizationId: f.owner.organizationId,
      kind: "SUPPLIER",
      status: "revoked",
      reason: "FAKE",
      evidenceReference: "FAKE",
      validUntil: f.now() + 100000,
    });
    await denied(f.service.metadata(f.buyer, f.id));
  });
  it("pending eligibility is not approval and reinstatement does not revive revoked grants", async () => {
    const f = await fixture();
    const g = await f.grant();
    await f.service.revoke(f.owner, g.invitationId);
    for (const status of ["pending", "approved"] as const) {
      await f.service.recordEligibility(f.admin, {
        organizationId: f.buyer.organizationId,
        kind: "BRAND",
        status,
        reason: "FAKE",
        evidenceReference: "FAKE",
        validUntil: f.now() + 100000,
      });
      await denied(f.service.metadata(f.buyer, f.id));
    }
  });
  it("denies wrong supplier objects and unrelated subject ownership", async () => {
    const f = await fixture();
    await denied(f.issue(f.buyer, ["view"], [randomUUID()]));
    await f.grant();
    f.repo.state.subjects[0].supplierId = f.other.organizationId;
    await denied(f.service.metadata(f.buyer, f.id));
  });
  it("replacement versions never inherit old grants", async () => {
    const f = await fixture();
    await f.grant();
    const v = await f.service.upload(
      f.owner,
      f.uploadInput,
      new TextEncoder().encode("FAKE replacement"),
    );
    await f.service.scan(f.owner, v.id);
    await denied(f.service.metadata(f.buyer, v.id));
  });
  it("narrows actions and rejects expansion or extension", async () => {
    const f = await fixture();
    const g = await f.grant();
    await f.service.narrow(
      f.owner,
      g.grantId,
      [f.id],
      ["view"],
      f.now() + 10000,
    );
    await denied(f.service.content(f.buyer, f.id, "download"));
    await denied(
      f.service.narrow(
        f.owner,
        g.grantId,
        [f.id],
        ["view", "download"],
        f.now() + 10000,
      ),
    );
    await denied(
      f.service.narrow(f.owner, g.grantId, [f.id], ["view"], f.now() + 20000),
    );
  });
  it("enforces separate view and download actions", async () => {
    const f = await fixture();
    await f.grant(f.buyer, ["download"]);
    await denied(f.service.metadata(f.buyer, f.id));
    expect(
      await new Response(
        await f.service.content(f.buyer, f.id, "download"),
      ).text(),
    ).toBe("FAKE document");
  });
  it("quarantines until content inspection is clean; rejected files remain unavailable", async () => {
    const f = await fixture();
    const v = await f.service.upload(
      f.owner,
      f.uploadInput,
      new TextEncoder().encode("malformed"),
    );
    await denied(f.issue(f.buyer, ["view"], [v.id]));
    await f.service.scan(f.owner, v.id);
    expect(f.repo.state.versions.find((x) => x.id === v.id)?.scan).toBe(
      "rejected",
    );
    await denied(f.issue(f.buyer, ["view"], [v.id]));
  });
  it("rejects malicious filenames, file type, size, empty bytes and wrong subject", async () => {
    const f = await fixture();
    for (const input of [
      { ...f.uploadInput, fileName: "../bad" },
      { ...f.uploadInput, fileName: "bad\r\nheader" },
      { ...f.uploadInput, mediaType: "text/html" },
      { ...f.uploadInput, subjectId: randomUUID() },
    ])
      await denied(
        f.service.upload(f.owner, input, new TextEncoder().encode("FAKE")),
      );
    await denied(f.service.upload(f.owner, f.uploadInput, new Uint8Array()));
    await denied(
      f.service.upload(
        f.owner,
        f.uploadInput,
        new Uint8Array(TEST_ONLY_POLICY.maxFileBytes + 1),
      ),
    );
  });
  it("withdrawal blocks subsequent requests", async () => {
    const f = await fixture();
    await f.grant();
    await f.service.withdraw(f.owner, f.id);
    await denied(f.service.metadata(f.buyer, f.id));
  });
  it("audit failure rolls back code redemption", async () => {
    const f = await fixture();
    const i = await f.issue();
    f.repo.failAudit = true;
    await expect(
      f.service.redeem(f.buyer, i.invitationId, i.code),
    ).rejects.toThrow();
    expect(f.repo.state.grants).toHaveLength(0);
    expect(f.repo.state.invitations[0].status).toBe("issued");
  });
  it("audit failure prevents signing and metadata release", async () => {
    const f = await fixture();
    await f.grant();
    f.repo.failAudit = true;
    await expect(
      f.service.content(f.buyer, f.id, "download"),
    ).rejects.toThrow();
    await expect(f.service.metadata(f.buyer, f.id)).rejects.toThrow();
    expect(f.storage.opened).toHaveLength(0);
  });
  it("records delivery failure without storing storage error or URL", async () => {
    const f = await fixture();
    await f.grant();
    f.storage.fail = true;
    await denied(f.service.content(f.buyer, f.id, "view"));
    expect(f.repo.state.events.at(-1)?.action).toBe("delivery-failed");
    expect(JSON.stringify(f.repo.state.events)).not.toContain(
      "secret-signature",
    );
  });
  it("serializes revocation before subsequent request decisions", async () => {
    const f = await fixture();
    const g = await f.grant();
    const results = await Promise.allSettled([
      f.service.revoke(f.owner, g.invitationId),
      f.service.metadata(f.buyer, f.id),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
  });
  it("already started stream survives revocation, but the next request does not", async () => {
    const f = await fixture();
    const g = await f.grant();
    const stream = await f.service.content(f.buyer, f.id, "view");
    await f.service.revoke(f.owner, g.invitationId);
    expect(await new Response(stream).text()).toBe("FAKE document");
    await denied(f.service.content(f.buyer, f.id, "view"));
  });
  it("binds signature expiry to the earliest validity", async () => {
    const f = await fixture();
    const g = await f.grant();
    await f.service.narrow(f.owner, g.grantId, [f.id], ["view"], f.now() + 100);
    await new Response(await f.service.content(f.buyer, f.id, "view")).text();
    expect(f.storage.opened[0].expires).toBe(f.now() + 100);
  });
  it("isolates supplier history and keeps unattributable guesses out", async () => {
    const f = await fixture();
    await f.grant();
    await f.service.metadata(f.buyer, f.id);
    await denied(f.service.redeem(f.other, randomUUID(), "wrong"));
    const ownerLog = await f.service.history(f.owner);
    expect(ownerLog.every((e) => e.supplierId === f.owner.organizationId)).toBe(
      true,
    );
    expect(
      ownerLog.some(
        (e) =>
          e.organizationName === "FAKE brand B" &&
          e.displayName === "FAKE brand recipient",
      ),
    ).toBe(true);
    expect(ownerLog.some((e) => e.action === "redemption-denied")).toBe(false);
    const otherLog = await f.service.history(f.other);
    expect(otherLog.some((e) => e.versionId === f.id)).toBe(false);
    await denied(f.service.history(f.buyer));
    await denied(f.service.history(f.admin));
  });
  it("filters history and verifies a concurrent append-only hash chain", async () => {
    const f = await fixture();
    await f.grant();
    await Promise.all([
      f.service.metadata(f.buyer, f.id),
      f.service.metadata(f.buyer, f.id),
    ]);
    const history = await f.service.history(f.owner, {
      userId: f.buyer.userId,
      action: "metadata",
      outcome: "allow",
      versionId: f.id,
      from: f.now(),
      until: f.now(),
    });
    expect(history).toHaveLength(2);
    let previous: string | null = null;
    for (const event of f.repo.state.events) {
      const { hash, ...rest } = event;
      expect(rest.previousHash).toBe(previous);
      expect(hash).toBe(
        createHash("sha256").update(JSON.stringify(rest)).digest("hex"),
      );
      previous = hash;
    }
  });
  it("only reviewers record eligibility and only ADMIN assigns management", async () => {
    const f = await fixture();
    const input = {
      organizationId: f.buyer.organizationId,
      kind: "BRAND" as const,
      status: "approved" as const,
      reason: "FAKE",
      evidenceReference: "FAKE",
      validUntil: f.now() + 10000,
    };
    await denied(f.service.recordEligibility(f.owner, input));
    await denied(
      f.service.recordEligibility(f.admin, { ...input, evidenceReference: "" }),
    );
    await denied(
      f.service.assignManager(
        f.owner,
        f.owner.organizationId,
        f.owner.userId,
        "FAKE",
        true,
      ),
    );
  });
  it("denies self-assignment, cross-supplier management and wildcard codes", async () => {
    const f = await fixture();
    f.repo.state.members
      .find((m) => m.userId === f.owner.userId)!
      .roles.push("ADMIN");
    await denied(
      f.service.assignManager(
        f.owner,
        f.owner.organizationId,
        f.owner.userId,
        "FAKE",
        true,
      ),
    );
    const i = await f.issue();
    await denied(f.service.revoke(f.other, i.invitationId));
    await denied(f.issue(f.buyer, ["view"], ["*"]));
  });
});

describe("FAKE HTTP and internal streaming boundary", () => {
  it("never returns upstream signed URLs, redirects or headers", async () => {
    const signed = "https://fake-storage.invalid/object?secret=FAKE";
    const fetcher = vi.fn(
      async () =>
        new Response("FAKE", {
          headers: { Location: signed, "X-Internal": signed },
        }),
    );
    const storage = new SignedStreamingStorage(
      { sign: async () => signed },
      async () => undefined,
      fetcher as typeof fetch,
    );
    expect(
      await new Response(
        await storage.openSigned("opaque", Date.now() + 10000),
      ).text(),
    ).toBe("FAKE");
    expect(fetcher).toHaveBeenCalledWith(signed, {
      cache: "no-store",
      redirect: "error",
    });
    const failed = new SignedStreamingStorage(
      {
        sign: async () => {
          throw Error(signed);
        },
      },
      async () => undefined,
    );
    await denied(failed.openSigned("opaque", Date.now() + 10000));
  });
  it("denies unauthenticated requests, CSRF, malformed bodies and remote imports", async () => {
    const f = await fixture();
    const handlers = createHandlers({
      actor: async () => f.owner,
      service: () => f.service,
      maxBodyBytes: () => 4096,
    });
    expect(
      (
        await handlers.POST(
          new Request("https://vle.test/api/gated", {
            method: "POST",
            headers: {
              Origin: "https://other.test",
              "Content-Type": "application/json",
            },
            body: "{}",
          }),
        )
      ).status,
    ).toBe(403);
    for (const body of [
      "invalid",
      JSON.stringify({
        operation: "upload",
        referenceUrl: "https://remote.test/a",
      }),
      JSON.stringify({
        operation: "redeem",
        invitationId: randomUUID(),
        code: "a".repeat(4097),
      }),
    ])
      expect(
        (
          await handlers.POST(
            new Request("https://vle.test/api/gated", {
              method: "POST",
              headers: {
                Origin: "https://vle.test",
                "Content-Type": "application/json",
              },
              body,
            }),
          )
        ).status,
      ).toBe(403);
    const signedOut = createHandlers({
      actor: async () => {
        throw new AccessDenied();
      },
      service: () => f.service,
      maxBodyBytes: () => 4096,
    });
    expect(
      (
        await signedOut.GET(
          new Request("https://vle.test/api/gated?operation=metadata"),
        )
      ).status,
    ).toBe(403);
  });
  it("rechecks preview, range, download and metadata across users and revocation", async () => {
    const f = await fixture();
    const g = await f.grant();
    let actor = f.buyer;
    const handlers = createHandlers({
      actor: async () => actor,
      service: () => f.service,
      maxBodyBytes: () => 4096,
    });
    const req = (operation: string) =>
      new Request(
        `https://vle.test/api/gated?operation=${operation}&versionId=${f.id}`,
        { headers: { Range: "bytes=0-2" } },
      );
    for (const op of ["preview", "content", "download", "metadata"]) {
      const response = await handlers.GET(req(op));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(response.headers.get("location")).toBeNull();
      expect(await response.text()).not.toContain("secret-signature");
    }
    actor = f.other;
    expect((await handlers.GET(req("preview"))).status).toBe(403);
    actor = f.buyer;
    await f.service.revoke(f.owner, g.invitationId);
    for (const op of ["preview", "content", "download", "metadata"])
      expect((await handlers.GET(req(op))).status).toBe(403);
  });
  it("HTTP issue and redeem are code-body only with no-store responses", async () => {
    const f = await fixture();
    let actor = f.owner;
    const handlers = createHandlers({
      actor: async () => actor,
      service: () => f.service,
      maxBodyBytes: () => 4096,
    });
    const post = (body: object) =>
      handlers.POST(
        new Request("https://vle.test/api/gated", {
          method: "POST",
          headers: {
            Origin: "https://vle.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
      );
    const response = await post({
      operation: "issue",
      recipient: f.buyer,
      versions: [f.id],
      actions: ["view"],
      codeExpires: f.now() + 10000,
      grantExpires: f.now() + 20000,
    });
    expect(response.status).toBe(200);
    const issued = await response.json();
    actor = f.buyer;
    expect((await post({ operation: "redeem", ...issued })).status).toBe(200);
    expect(JSON.stringify(f.repo.state.events)).not.toContain(issued.code);
  });
});

// TEST-ONLY end-to-end storage capability boundary.
it("signed storage capabilities never reach HTTP responses or access history", async () => {
  const f = await fixture();
  await f.grant();
  const capability = "https://fake-storage.invalid/FAKE?signature=FAKE-secret";
  const storage = new SignedStreamingStorage(
    { sign: async () => capability },
    async () => undefined,
    (async () =>
      new Response("FAKE bytes", {
        headers: { Location: capability, "X-Storage-Url": capability },
      })) as typeof fetch,
  );
  const service = new GatedService(
    f.repo,
    storage,
    f.scanner,
    TEST_ONLY_POLICY,
    f.now,
  );
  const handlers = createHandlers({
    actor: async () => f.buyer,
    service: () => service,
    maxBodyBytes: () => TEST_ONLY_POLICY.maxFileBytes,
  });
  const response = await handlers.GET(
    new Request(
      `https://vle.test/api/gated?operation=download&versionId=${f.id}`,
    ),
  );
  expect(response.status).toBe(200);
  const visible =
    JSON.stringify([...response.headers]) +
    (await response.text()) +
    JSON.stringify(await service.history(f.owner));
  expect(visible).not.toContain(capability);
  expect(visible).not.toContain("FAKE-secret");
});
