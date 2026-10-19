import "server-only";
import bundled from "./faq-sourcing.json";
import {sourcingFaqSchema} from "@/domain/sourcing-faq";
export async function loadSourcingGuide(){
 const result=sourcingFaqSchema.safeParse(bundled);
 return result.success?{status:"ready" as const,data:result.data}:{status:"unavailable" as const,data:{groups:[]}};
}
