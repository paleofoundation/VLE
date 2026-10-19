import {loadSourcingGuide} from "@/content/fieldwork/sourcing-guide";
import {faqStructuredData,safeJsonLd} from "@/domain/sourcing-faq";
import {SourcingGuide} from "@/components/fieldwork/sourcing-guide";
export const dynamic="force-dynamic";
export const metadata={title:"Ingredient sourcing guide for brands and QA",description:"Source-led ingredient questions for brand buyers and QA managers, with numbered references and direct supplier searches.",alternates:{canonical:"https://vle.exchange/faq"}};
export default async function FAQ(){const {data,status}=await loadSourcingGuide();return <main id="main-content" className="fw-container fw-page"><p className="fw-eyebrow">FOR BRANDS AND QA MANAGERS</p><h1>Ask better.<br/>Source with evidence.</h1><p className="fw-page-lead">A sourcing guide by ingredient. Start with your question, follow the numbered sources, then find suppliers and open their documents.</p><SourcingGuide data={data} unavailable={status==="unavailable"}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(faqStructuredData(data))}}/></main>}
