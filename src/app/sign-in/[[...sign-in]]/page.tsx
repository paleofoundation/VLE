import {PasswordlessSignIn} from "@/components/fieldwork/sign-in";
import {safeReturn} from "@/domain/account";
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){return <main id="main-content" className="fw-container fw-auth-page"><PasswordlessSignIn next={safeReturn((await searchParams).next)??"/onboarding"}/></main>}
