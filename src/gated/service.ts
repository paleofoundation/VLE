import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  AccessDenied,
  type Action,
  type Eligibility,
  type Event,
  type Identity,
  type Invitation,
  type Policy,
  type PrivateStorage,
  type Repository,
  type Scanner,
  type State,
  type Version,
} from "./model";
import { validatePolicy } from "./policy";

const same = (a: Identity, b: Identity) =>
  a.userId === b.userId && a.organizationId === b.organizationId;
const requireValue = <T>(value: T | undefined | null | false): T => {
  if (!value) throw new AccessDenied();
  return value;
};
const nonempty = (value: string) =>
  requireValue(typeof value === "string" && value.trim());
export class GatedService {
  constructor(
    private repo: Repository,
    private storage: PrivateStorage,
    private scanner: Scanner,
    private policy: Policy,
    private clock = Date.now,
  ) {
    validatePolicy(policy);
  }
  private member(s: State, a: Identity) {
    return requireValue(s.members.find((m) => same(m, a)));
  }
  private eligible(s: State, a: Identity) {
    const member = this.member(s, a);
    const e = s.eligibility
      .filter((e) => e.organizationId === a.organizationId)
      .at(-1);
    requireValue(e && e.status === "approved" && e.validUntil > this.clock());
    requireValue(
      member.roles.includes(e!.kind === "SUPPLIER" ? "SUPPLIER" : "BUYER"),
    );
    return member;
  }
  private supplier(s: State, id: string) {
    const e = s.eligibility.filter((e) => e.organizationId === id).at(-1);
    requireValue(
      e &&
        e.kind === "SUPPLIER" &&
        e.status === "approved" &&
        e.validUntil > this.clock(),
    );
  }
  private manager(s: State, a: Identity, supplierId: string) {
    const member = this.eligible(s, a);
    this.supplier(s, supplierId);
    requireValue(
      a.organizationId === supplierId && member.roles.includes("SUPPLIER"),
    );
    requireValue(
      s.assignments.some(
        (x) => x.supplierId === supplierId && x.userId === a.userId && x.active,
      ),
    );
  }
  private audit(
    s: State,
    a: Identity,
    action: string,
    supplierId: string | null,
    detail: Partial<Pick<Event, "versionId" | "invitationId" | "grantId">> = {},
    outcome: "allow" | "deny" = "allow",
    reason = "authorized",
  ) {
    const member = s.members.find((m) => same(m, a));
    const event = {
      id: randomUUID(),
      at: this.clock(),
      supplierId,
      actor: { userId: a.userId, organizationId: a.organizationId },
      organizationName: member?.organizationName ?? "Unavailable",
      displayName: member?.displayName ?? "Unavailable",
      ...detail,
      action,
      outcome,
      reason,
      revision: this.policy.revision,
      correlation: randomUUID(),
      previousHash: s.events.at(-1)?.hash ?? null,
    };
    s.events.push({
      ...event,
      hash: createHash("sha256").update(JSON.stringify(event)).digest("hex"),
    });
  }
  private digest(code: string) {
    return createHmac("sha256", this.policy.digestKey).update(code).digest();
  }
  private version(s: State, id: string, supplierId: string) {
    const v = requireValue(
      s.versions.find((v) => v.id === id && v.supplierId === supplierId),
    );
    this.supplier(s, supplierId);
    requireValue(
      s.subjects.some(
        (x) =>
          x.id === v.subjectId &&
          x.subject === v.subject &&
          x.supplierId === supplierId,
      ),
    );
    requireValue(
      v.available && v.scan === "clean" && v.validUntil > this.clock(),
    );
    return v;
  }
  private access(s: State, a: Identity, id: string, action: Action) {
    this.eligible(s, a);
    const grant = requireValue(
      s.grants.find(
        (g) =>
          same(g.recipient, a) &&
          !g.revoked &&
          g.expires > this.clock() &&
          g.versions.includes(id) &&
          g.actions.includes(action),
      ),
    );
    const invitation = requireValue(
      s.invitations.find(
        (i) =>
          i.id === grant.invitationId &&
          i.status === "redeemed" &&
          same(i.recipient, a) &&
          i.supplierId === grant.supplierId,
      ),
    );
    requireValue(
      invitation.versions.includes(id) && invitation.actions.includes(action),
    );
    return { grant, version: this.version(s, id, grant.supplierId) };
  }
  async recordEligibility(
    a: Identity,
    input: Omit<Eligibility, "id" | "reviewer" | "decidedAt">,
  ) {
    return this.repo.transaction((s) => {
      requireValue(
        this.member(s, a).roles.some((r) => r === "OPS" || r === "ADMIN"),
      );
      nonempty(input.reason);
      nonempty(input.evidenceReference);
      requireValue(
        s.members.some((m) => m.organizationId === input.organizationId),
      );
      requireValue(
        ["pending", "approved", "revoked"].includes(input.status) &&
          ["SUPPLIER", "BRAND"].includes(input.kind) &&
          Number.isFinite(input.validUntil),
      );
      s.eligibility.push({
        ...input,
        id: randomUUID(),
        reviewer: a.userId,
        decidedAt: this.clock(),
      });
      this.audit(
        s,
        a,
        "eligibility-recorded",
        input.kind === "SUPPLIER" ? input.organizationId : null,
      );
    });
  }
  async assignManager(
    a: Identity,
    supplierId: string,
    userId: string,
    authorizationReference: string,
    active: boolean,
  ) {
    return this.repo.transaction((s) => {
      requireValue(this.member(s, a).roles.includes("ADMIN"));
      nonempty(authorizationReference);
      requireValue(
        this.member(s, { userId, organizationId: supplierId }).roles.includes(
          "SUPPLIER",
        ),
      );
      // No self-assignment through a platform role.
      requireValue(a.userId !== userId);
      s.assignments
        .filter((x) => x.supplierId === supplierId && x.userId === userId)
        .forEach((x) => {
          x.active = false;
        });
      s.assignments.push({
        id: randomUUID(),
        supplierId,
        userId,
        assignedBy: a.userId,
        authorizationReference,
        active,
      });
      this.audit(
        s,
        a,
        active ? "manager-assigned" : "manager-removed",
        supplierId,
      );
    });
  }
  async issue(
    a: Identity,
    input: Pick<
      Invitation,
      "recipient" | "versions" | "actions" | "codeExpires" | "grantExpires"
    >,
  ) {
    return this.repo.transaction((s) => {
      this.manager(s, a, a.organizationId);
      this.eligible(s, input.recipient);
      const now = this.clock();
      requireValue(
        Number.isFinite(input.codeExpires) &&
          input.codeExpires > now &&
          input.codeExpires <= now + this.policy.redemptionLifetimeMs &&
          input.codeExpires <= input.grantExpires,
      );
      requireValue(
        Number.isFinite(input.grantExpires) &&
          input.grantExpires > now &&
          input.grantExpires <= now + this.policy.maxGrantLifetimeMs,
      );
      requireValue(
        input.versions.length &&
          input.actions.length &&
          input.actions.every((x) => x === "view" || x === "download"),
      );
      input.versions.forEach((id) => this.version(s, id, a.organizationId));
      const code = randomBytes(this.policy.codeBytes).toString("base64url");
      const invitation: Invitation = {
        ...structuredClone(input),
        id: randomUUID(),
        supplierId: a.organizationId,
        issuerId: a.userId,
        digest: this.digest(code).toString("hex"),
        status: "issued",
      };
      s.invitations.push(invitation);
      this.audit(
        s,
        a,
        same(a, input.recipient) ? "owner-code-issued" : "code-issued",
        a.organizationId,
        { invitationId: invitation.id },
      );
      return { invitationId: invitation.id, code };
    });
  }
  async redeem(a: Identity, invitationId: string, code: string) {
    const result = await this.repo.transaction((s) => {
      // Failure is committed for throttling and audit, but never creates authority.
      try {
        this.eligible(s, a);
        let attempt = s.attempts.find(
          (x) => x.id === `${a.userId}:${a.organizationId}`,
        );
        if (!attempt) {
          attempt = {
            id: `${a.userId}:${a.organizationId}`,
            count: 0,
            windowStart: this.clock(),
          };
          s.attempts.push(attempt);
        }
        if (this.clock() >= attempt.windowStart + this.policy.attemptWindowMs) {
          attempt.count = 0;
          attempt.windowStart = this.clock();
        }
        requireValue(attempt.count < this.policy.attemptsPerWindow);
        attempt.count++;
        const i = s.invitations.find((x) => x.id === invitationId);
        const expected = i ? Buffer.from(i.digest, "hex") : this.digest("");
        const supplied = this.digest(typeof code === "string" ? code : "");
        requireValue(
          expected.length === supplied.length &&
            timingSafeEqual(expected, supplied),
        );
        if (
          i &&
          same(i.recipient, a) &&
          i.status === "issued" &&
          i.codeExpires <= this.clock()
        ) {
          i.status = "expired";
          this.audit(
            s,
            a,
            "code-expiry-observed",
            i.supplierId,
            { invitationId: i.id },
            "deny",
            "expired",
          );
        }
        requireValue(
          i &&
            same(i.recipient, a) &&
            i.status === "issued" &&
            i.codeExpires > this.clock() &&
            i.grantExpires > this.clock(),
        );
        this.manager(
          s,
          { userId: i!.issuerId, organizationId: i!.supplierId },
          i!.supplierId,
        );
        i!.versions.forEach((id) => this.version(s, id, i!.supplierId));
        requireValue(!s.grants.some((g) => g.invitationId === i!.id));
        const grant = {
          id: randomUUID(),
          invitationId: i!.id,
          supplierId: i!.supplierId,
          recipient: { ...a },
          versions: [...i!.versions],
          actions: [...i!.actions],
          expires: i!.grantExpires,
          revoked: false,
          revision: this.policy.revision,
        };
        s.grants.push(grant);
        i!.status = "redeemed";
        this.audit(s, a, "code-redeemed", i!.supplierId, {
          invitationId: i!.id,
          grantId: grant.id,
        });
        return grant.id;
      } catch (error) {
        if (!(error instanceof AccessDenied)) throw error;
        // Unknown or guessed codes never attribute a recipient to another supplier.
        this.audit(s, a, "redemption-denied", null, {}, "deny", "unavailable");
        return null;
      }
    });
    return requireValue(result);
  }
  async cancel(a: Identity, id: string) {
    return this.repo.transaction((s) => {
      const i = requireValue(s.invitations.find((i) => i.id === id));
      this.manager(s, a, i.supplierId);
      requireValue(i.status === "issued");
      i.status = "cancelled";
      this.audit(s, a, "code-cancelled", i.supplierId, { invitationId: i.id });
    });
  }
  async revoke(a: Identity, invitationId: string) {
    return this.repo.transaction((s) => {
      const i = requireValue(s.invitations.find((i) => i.id === invitationId));
      this.manager(s, a, i.supplierId);
      i.status = "cancelled";
      s.grants
        .filter((g) => g.invitationId === i.id)
        .forEach((g) => {
          g.revoked = true;
        });
      this.audit(s, a, "invitation-and-grant-revoked", i.supplierId, {
        invitationId: i.id,
      });
    });
  }
  async narrow(
    a: Identity,
    grantId: string,
    versions: string[],
    actions: Action[],
    expires: number,
  ) {
    return this.repo.transaction((s) => {
      const g = requireValue(s.grants.find((g) => g.id === grantId));
      this.manager(s, a, g.supplierId);
      requireValue(
        !g.revoked &&
          versions.every((v) => g.versions.includes(v)) &&
          actions.every((v) => g.actions.includes(v)) &&
          Number.isFinite(expires) &&
          expires <= g.expires,
      );
      g.versions = [...versions];
      g.actions = [...actions];
      g.expires = expires;
      g.revision = this.policy.revision;
      this.audit(s, a, "grant-narrowed", g.supplierId, { grantId });
    });
  }
  async upload(
    a: Identity,
    input: Pick<
      Version,
      "subject" | "subjectId" | "fileName" | "mediaType" | "validUntil"
    >,
    bytes: Uint8Array,
  ) {
    return this.repo.transaction(async (s) => {
      this.manager(s, a, a.organizationId);
      requireValue(
        s.subjects.some(
          (x) =>
            x.id === input.subjectId &&
            x.subject === input.subject &&
            x.supplierId === a.organizationId,
        ),
      );
      requireValue(
        bytes.length > 0 &&
          bytes.length <= this.policy.maxFileBytes &&
          this.policy.allowedMediaTypes.includes(input.mediaType),
      );
      requireValue(
        input.fileName &&
          !/[\x00-\x1f\x7f/\\]/.test(input.fileName) &&
          Number.isFinite(input.validUntil) &&
          input.validUntil > this.clock(),
      );
      const version: Version = {
        ...input,
        id: randomUUID(),
        supplierId: a.organizationId,
        objectKey: randomUUID(),
        checksum: createHash("sha256").update(bytes).digest("hex"),
        size: bytes.length,
        scan: "quarantine",
        available: false,
      };
      await this.storage.putQuarantined(version.objectKey, bytes);
      s.versions.push(version);
      this.audit(s, a, "upload-quarantined", a.organizationId, {
        versionId: version.id,
      });
      return { id: version.id, scan: version.scan };
    });
  }
  async scan(a: Identity, id: string) {
    return this.repo.transaction(async (s) => {
      const v = requireValue(s.versions.find((v) => v.id === id));
      this.manager(s, a, v.supplierId);
      requireValue(v.scan === "quarantine");
      v.scan = await this.scanner.inspect(v.objectKey, v.mediaType, v.checksum);
      v.available = v.scan === "clean";
      this.audit(s, a, "scan-recorded", v.supplierId, { versionId: id });
    });
  }
  async withdraw(a: Identity, id: string) {
    return this.repo.transaction((s) => {
      const v = requireValue(s.versions.find((v) => v.id === id));
      this.manager(s, a, v.supplierId);
      v.available = false;
      this.audit(s, a, "document-withdrawn", v.supplierId, { versionId: id });
    });
  }
  private async authorize(
    a: Identity,
    id: string,
    action: Action,
    label: string,
  ) {
    const result = await this.repo.transaction((s) => {
      try {
        const result = this.access(s, a, id, action);
        this.audit(s, a, label, result.version.supplierId, {
          versionId: id,
          grantId: result.grant.id,
        });
        return structuredClone(result);
      } catch (error) {
        if (!(error instanceof AccessDenied)) throw error;
        const g = s.grants.find(
          (g) => same(g.recipient, a) && g.versions.includes(id),
        );
        this.audit(
          s,
          a,
          label,
          g?.supplierId ?? null,
          g ? { versionId: id, grantId: g.id } : {},
          "deny",
          "unavailable-or-expired",
        );
        return null;
      }
    });
    return requireValue(result);
  }
  async metadata(a: Identity, id: string) {
    const { version } = await this.authorize(a, id, "view", "metadata");
    return {
      id: version.id,
      fileName: version.fileName,
      mediaType: version.mediaType,
    };
  }
  async content(
    a: Identity,
    id: string,
    action: Action,
    label: string = action,
  ) {
    const { version, grant } = await this.authorize(a, id, action, label);
    // This committed decision precedes signing. A later revocation cannot recall this stream.
    try {
      const stream = await this.storage.openSigned(
        version.objectKey,
        Math.min(
          this.clock() + this.policy.signedUrlLifetimeMs,
          grant.expires,
          version.validUntil,
        ),
      );
      try {
        await this.delivery(a, version, grant.id, "delivery-ready");
      } catch {
        await stream.cancel().catch(() => undefined);
        throw new AccessDenied();
      }
      const reader = stream.getReader();
      return new ReadableStream<Uint8Array>({
        pull: async (controller) => {
          try {
            const part = await reader.read();
            if (part.done) {
              await this.delivery(a, version, grant.id, "response-complete");
              controller.close();
            } else controller.enqueue(part.value);
          } catch {
            await this.delivery(a, version, grant.id, "delivery-failed").catch(
              () => undefined,
            );
            controller.error(new AccessDenied());
          }
        },
        cancel: async () => {
          await reader.cancel();
          await this.delivery(a, version, grant.id, "delivery-cancelled");
        },
      });
    } catch {
      await this.delivery(a, version, grant.id, "delivery-failed").catch(
        () => undefined,
      );
      throw new AccessDenied();
    }
  }
  private delivery(a: Identity, v: Version, grantId: string, action: string) {
    return this.repo.transaction((s) =>
      this.audit(
        s,
        a,
        action,
        v.supplierId,
        { versionId: v.id, grantId },
        action === "delivery-failed" ? "deny" : "allow",
      ),
    );
  }
  async history(
    a: Identity,
    filters: {
      versionId?: string;
      userId?: string;
      action?: string;
      outcome?: string;
      from?: number;
      until?: number;
    } = {},
  ) {
    return this.repo.transaction((s) => {
      this.manager(s, a, a.organizationId);
      this.audit(s, a, "history-view", a.organizationId);
      return s.events
        .filter(
          (e) =>
            e.supplierId === a.organizationId &&
            (!filters.versionId || e.versionId === filters.versionId) &&
            (!filters.userId || e.actor.userId === filters.userId) &&
            (!filters.action || e.action === filters.action) &&
            (!filters.outcome || e.outcome === filters.outcome) &&
            (filters.from === undefined || e.at >= filters.from) &&
            (filters.until === undefined || e.at <= filters.until),
        )
        .map((e) => ({ ...e }));
    });
  }
  async management(a: Identity) {
    return this.repo.transaction((s) => {
      this.manager(s, a, a.organizationId);
      this.audit(s, a, "management-metadata", a.organizationId);
      return {
        versions: s.versions
          .filter((v) => v.supplierId === a.organizationId)
          .map((v) => ({
            id: v.id,
            fileName: v.fileName,
            scan: v.scan,
            available: v.available,
          })),
        invitations: s.invitations
          .filter((i) => i.supplierId === a.organizationId)
          .map((i) => ({
            id: i.id,
            recipient: i.recipient,
            versions: i.versions,
            actions: i.actions,
            status:
              i.status === "issued" && i.codeExpires <= this.clock()
                ? ("expired" as const)
                : i.status,
            codeExpires: i.codeExpires,
            grantExpires: i.grantExpires,
          })),
        grants: s.grants
          .filter((g) => g.supplierId === a.organizationId)
          .map((g) => ({ ...g })),
      };
    });
  }
}
