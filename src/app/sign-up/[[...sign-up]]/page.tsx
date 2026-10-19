import { ClerkProvider, SignUp } from "@clerk/nextjs";
import { safeNext } from "@/domain/onboarding";
export const metadata = { title: "Sign up | VLE", robots: { index: false, follow: false } };
export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams; const next = safeNext(p.next);
  const query = new URLSearchParams({ as: p.as === "brand" ? "brand" : "supplier", ...(next ? { next } : {}) });
  return <ClerkProvider><main id="main-content" className="authPage"><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl={`/onboarding?${query}`} /></main></ClerkProvider>;
}
