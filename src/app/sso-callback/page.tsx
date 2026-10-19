import {ClerkProvider,AuthenticateWithRedirectCallback} from "@clerk/nextjs";
export const metadata={robots:{index:false,follow:false}};
export default function Callback(){return <ClerkProvider><main id="main-content" className="fw-container fw-auth-page"><AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/onboarding" signUpFallbackRedirectUrl="/onboarding"/></main></ClerkProvider>}
