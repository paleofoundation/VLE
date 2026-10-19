import {readFile,writeFile} from "node:fs/promises";
import {sourcingFaqSchema} from "../src/domain/sourcing-faq";
const source="/Users/kmfp/Documents/ChatGPT/vle-buildout/faq-sourcing.json";
try{
 const raw=await readFile(source,"utf8");
 sourcingFaqSchema.parse(JSON.parse(raw));
 await writeFile(new URL("../src/content/fieldwork/faq-sourcing.json",import.meta.url),raw);
 console.log("Imported supplied sourcing guide.");
}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;console.log("Sourcing guide not supplied; retaining the empty state or last imported source file.");}
