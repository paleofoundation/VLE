import { createHash } from "node:crypto";
import type { EvidenceInput, FrozenProfile, QualificationOutcome } from "./types";

export type QualificationResult = {
  outcome: QualificationOutcome;
  rationale: readonly { analyte: string; resultPpm?: number; maxPpm: number; finding: string }[];
  inputHash: string;
};

function stableJson(value: unknown) {
  return JSON.stringify(value, (_key, child) => {
    if (!child || typeof child !== "object" || Array.isArray(child) || child instanceof Date) return child;
    return Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b)));
  });
}

export function qualify(
  profile: FrozenProfile,
  evidence: EvidenceInput,
  now: Date,
): QualificationResult {
  const inputHash = createHash("sha256")
    .update(stableJson({ profile, evidence, evaluatedAt: now.toISOString().slice(0, 10) }))
    .digest("hex");

  if (evidence.status !== "CURRENT" || evidence.expiresAt <= now) {
    return { outcome: "INSUFFICIENT_EVIDENCE", rationale: [], inputHash };
  }

  const byAnalyte = new Map(evidence.results.map((result) => [result.analyte, result]));
  const rationale = profile.rules.map((rule) => {
    const result = byAnalyte.get(rule.analyte);
    return {
      analyte: rule.analyte,
      resultPpm: result?.valuePpm,
      maxPpm: rule.maxPpm,
      finding: !result ? "MISSING" : result.valuePpm <= rule.maxPpm ? "PASS" : "FAIL",
    };
  });

  if (rationale.some((item) => item.finding === "MISSING")) {
    return { outcome: "INSUFFICIENT_EVIDENCE", rationale, inputHash };
  }
  return {
    outcome: rationale.some((item) => item.finding === "FAIL") ? "NOT_QUALIFIED" : "QUALIFIED",
    rationale,
    inputHash,
  };
}
