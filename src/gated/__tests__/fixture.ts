// TEST-ONLY. All organizations, users, bytes and policy values are FAKE.
import { createHash, randomUUID } from "node:crypto";
import {
  emptyState,
  type Identity,
  type Policy,
  type PrivateStorage,
  type Repository,
  type Scanner,
  type State,
} from "../model";
import { GatedService } from "../service";
export const TEST_ONLY_POLICY: Policy = {
  revision: "TEST-ONLY",
  codeBytes: 32,
  digestKey: "TEST-ONLY-FAKE-secret",
  attemptsPerWindow: 4,
  attemptWindowMs: 1000,
  redemptionLifetimeMs: 10000,
  maxGrantLifetimeMs: 20000,
  signedUrlLifetimeMs: 500,
  maxFileBytes: 4096,
  allowedMediaTypes: ["text/plain"],
};
export class FakeRepository implements Repository {
  state = emptyState();
  failAudit = false;
  private queue: Promise<unknown> = Promise.resolve();
  async transaction<T>(work: (state: State) => Promise<T> | T): Promise<T> {
    const task = this.queue.then(async () => {
      const next = structuredClone(this.state);
      const result = await work(next);
      if (this.failAudit && next.events.length !== this.state.events.length)
        throw Error("FAKE audit unavailable");
      this.state = next;
      return result;
    });
    this.queue = task.catch(() => undefined);
    return task;
  }
}
export class FakeStorage implements PrivateStorage {
  objects = new Map<string, Uint8Array>();
  opened: { key: string; expires: number }[] = [];
  fail = false;
  async putQuarantined(key: string, bytes: Uint8Array) {
    this.objects.set(key, bytes.slice());
  }
  async openSigned(key: string, expires: number) {
    if (this.fail) throw Error("https://fake-storage.invalid/secret-signature");
    this.opened.push({ key, expires });
    const bytes = this.objects.get(key);
    if (!bytes) throw Error("FAKE missing");
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }
}
export async function fixture() {
  let now = Date.now();
  const repo = new FakeRepository();
  const storage = new FakeStorage();
  const scanner: Scanner = {
    async inspect(key, mediaType, checksum) {
      const bytes = storage.objects.get(key);
      return mediaType === "text/plain" &&
        bytes &&
        createHash("sha256").update(bytes).digest("hex") === checksum &&
        new TextDecoder().decode(bytes).startsWith("FAKE")
        ? "clean"
        : "rejected";
    },
  };
  const supplierId = randomUUID(),
    buyerId = randomUUID(),
    otherId = randomUUID(),
    platformId = randomUUID();
  const owner: Identity = { userId: randomUUID(), organizationId: supplierId };
  const buyer: Identity = { userId: randomUUID(), organizationId: buyerId };
  const other: Identity = { userId: randomUUID(), organizationId: otherId };
  const admin: Identity = { userId: randomUUID(), organizationId: platformId };
  repo.state.members = [
    {
      ...owner,
      roles: ["SUPPLIER"],
      displayName: "FAKE supplier manager",
      organizationName: "FAKE supplier A",
    },
    {
      ...buyer,
      roles: ["BUYER"],
      displayName: "FAKE brand recipient",
      organizationName: "FAKE brand B",
    },
    {
      ...other,
      roles: ["SUPPLIER"],
      displayName: "FAKE supplier recipient",
      organizationName: "FAKE supplier C",
    },
    {
      ...admin,
      roles: ["ADMIN"],
      displayName: "FAKE administrator",
      organizationName: "FAKE platform",
    },
  ];
  const lotId = randomUUID();
  repo.state.subjects.push({ id: lotId, supplierId, subject: "LOT" });
  const service = new GatedService(
    repo,
    storage,
    scanner,
    TEST_ONLY_POLICY,
    () => now,
  );
  for (const [organizationId, kind] of [
    [supplierId, "SUPPLIER"],
    [buyerId, "BRAND"],
    [otherId, "SUPPLIER"],
  ] as const)
    await service.recordEligibility(admin, {
      organizationId,
      kind,
      status: "approved",
      validUntil: now + 100000,
      reason: "FAKE review",
      evidenceReference: "FAKE evidence",
    });
  await service.assignManager(
    admin,
    supplierId,
    owner.userId,
    "FAKE authority",
    true,
  );
  await service.assignManager(
    admin,
    otherId,
    other.userId,
    "FAKE authority",
    true,
  );
  const uploadInput = {
    subject: "LOT" as const,
    subjectId: lotId,
    fileName: "FAKE.txt",
    mediaType: "text/plain",
    validUntil: now + 100000,
  };
  const { id } = await service.upload(
    owner,
    uploadInput,
    new TextEncoder().encode("FAKE document"),
  );
  await service.scan(owner, id);
  const issue = (
    recipient = buyer,
    actions: ("view" | "download")[] = ["view", "download"],
    versions = [id],
  ) =>
    service.issue(owner, {
      recipient,
      versions,
      actions,
      codeExpires: now + 10000,
      grantExpires: now + 20000,
    });
  const grant = async (
    recipient = buyer,
    actions: ("view" | "download")[] = ["view", "download"],
  ) => {
    const invitation = await issue(recipient, actions);
    const grantId = await service.redeem(
      recipient,
      invitation.invitationId,
      invitation.code,
    );
    return { ...invitation, grantId };
  };
  return {
    repo,
    storage,
    scanner,
    service,
    owner,
    buyer,
    other,
    admin,
    id,
    lotId,
    uploadInput,
    issue,
    grant,
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
