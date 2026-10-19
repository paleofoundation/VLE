import "server-only";
import {readFile} from "node:fs/promises";
import bundled from "./faq-sourcing.json";
import {sourcingFaqSchema} from "@/domain/sourcing-faq";
export const SOURCING_FAQ_PATH="/Users/kmfp/Documents/ChatGPT/vle-buildout/faq-sourcing.json";
export async function loadSourcingGuide(){
 let input:unknown=bundled;
 try{input=JSON.parse(await readFile(SOURCING_FAQ_PATH,"utf8"));}
 catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")return {status:"unavailable" as const,data:{groups:[]}};}
 const result=sourcingFaqSchema.safeParse(input);
 return result.success?{status:"ready" as const,data:result.data}:{status:"unavailable" as const,data:{groups:[]}};
}
