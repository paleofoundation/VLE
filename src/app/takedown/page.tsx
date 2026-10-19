import { TakedownForm } from "./form";
export const metadata = { title: "Request a listing takedown", alternates: { canonical: "https://vle.exchange/takedown" } };
export default async function Takedown({searchParams}:{searchParams:Promise<{profile?:string}>}) {
 const profile=(await searchParams).profile??"";
 return <main id="main-content" className="fw-container fw-page fw-narrow"><p className="fw-eyebrow">LISTING SUPPORT</p><h1>Request a removal.</h1><p className="fw-page-lead">Takedown requests are honoured within 5 business days. No account is required.</p><p>Contact <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a> for help with a listing.</p><TakedownForm profileUrl={/^[a-z0-9-]+$/.test(profile)?`https://vle.exchange/suppliers/${profile}`:""}/></main>;
}
