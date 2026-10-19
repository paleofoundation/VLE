"use server";
import { redirect } from "next/navigation";
import { resolveCurrentAccess } from "@/lib/current-actor";
import { completeOnboarding } from "@/services/onboarding";
import { onboardingSchema, safeNext } from "@/domain/onboarding";
export async function onboardAction(_previous: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") redirect("/sign-in");
  if (access.status === "ACTIVE") redirect(access.actor.roles.includes("SUPPLIER") ? "/supplier" : "/buyer");
  const parsed = onboardingSchema.safeParse({ ...Object.fromEntries(form), categories: form.getAll("categories") });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(". ") };
  let destination: string;
  try { destination = await completeOnboarding(access.identity, parsed.data); }
  catch { return { error: "We could not create your organization. Verify your primary email and try again, or contact marcus@vle.exchange." }; }
  redirect(safeNext(form.get("next")) ?? destination);
}
