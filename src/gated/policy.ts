import { AccessDenied, type Policy } from "./model";

// No production defaults. These settings require a separate approved configuration.
export function loadPolicy(env: Record<string, string | undefined>): Policy {
  return validatePolicy({
    revision: env.GATED_POLICY_REVISION!,
    digestKey: env.GATED_CODE_DIGEST_KEY!,
    codeBytes: Number(env.GATED_CODE_BYTES),
    attemptsPerWindow: Number(env.GATED_ATTEMPTS_PER_WINDOW),
    attemptWindowMs: Number(env.GATED_ATTEMPT_WINDOW_MS),
    redemptionLifetimeMs: Number(env.GATED_REDEMPTION_LIFETIME_MS),
    maxGrantLifetimeMs: Number(env.GATED_MAX_GRANT_LIFETIME_MS),
    signedUrlLifetimeMs: Number(env.GATED_SIGNED_URL_LIFETIME_MS),
    maxFileBytes: Number(env.GATED_MAX_FILE_BYTES),
    allowedMediaTypes:
      env.GATED_ALLOWED_MEDIA_TYPES?.split(",").map((s) => s.trim()) ?? [],
  });
}
export function validatePolicy(policy: Policy): Policy {
  if (
    !policy.revision?.trim() ||
    !policy.digestKey?.trim() ||
    !policy.allowedMediaTypes.length ||
    policy.allowedMediaTypes.some((t) => !t.trim())
  )
    throw new AccessDenied();
  for (const value of [
    policy.codeBytes,
    policy.attemptsPerWindow,
    policy.attemptWindowMs,
    policy.redemptionLifetimeMs,
    policy.maxGrantLifetimeMs,
    policy.signedUrlLifetimeMs,
    policy.maxFileBytes,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new AccessDenied();
  }
  return policy;
}
// Retention and lawful deletion are TODO configuration only. No deletion job.
