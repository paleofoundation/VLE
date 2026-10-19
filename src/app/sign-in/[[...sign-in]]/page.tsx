import { ClerkProvider, SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <ClerkProvider><main id="main-content" className="authPage"><SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/onboarding" /></main></ClerkProvider>;
}
