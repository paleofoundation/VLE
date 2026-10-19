import { z } from "zod";
import { CATEGORIES } from "./public-listings";
export const onboardingSchema = z.object({
  role: z.enum(["SUPPLIER", "BUYER"]), companyName: z.string().trim().min(2).max(160),
  website: z.string().trim().url().max(500).refine((s) => new URL(s).protocol === "https:", "Use an HTTPS website"),
  country: z.string().trim().min(2).max(120), companyRole: z.string().trim().min(2).max(120),
  categories: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length).default([]),
}).refine((v) => v.role !== "SUPPLIER" || v.categories.length > 0, "Choose at least one ingredient category");
export function safeNext(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  const url = new URL(value, "https://vle.exchange");
  return url.origin === "https://vle.exchange" && !/^\/(?:sign-in|sign-up|onboarding)(?:[/?]|$)/.test(value) ? `${url.pathname}${url.search}${url.hash}` : null;
}
export function websiteEmailMatches(website: string | null, email: string | null) {
  if (!website || !email) return false;
  try { const domain = new URL(website).hostname.toLowerCase().replace(/^www\./, ""); return domain === email.toLowerCase().split("@")[1]; } catch { return false; }
}
