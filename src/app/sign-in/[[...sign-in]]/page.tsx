import {PasswordlessSignIn} from "@/components/fieldwork/sign-in";
import {safeReturn} from "@/domain/account";
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const target=safeReturn((await searchParams).next);return <main id="main-content" className="fw-container fw-auth-page"><PasswordlessSignIn next={target?`/onboarding?next=${encodeURIComponent(target)}`:"/onboarding"}/></main>}
