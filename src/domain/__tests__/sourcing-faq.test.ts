import {describe,it,expect} from "vitest";
import {sourcingFaqSchema,faqStructuredData,safeJsonLd} from "../sourcing-faq";
const question={id:"source-question",question:"Source question?",answer:"Source answer.",sources:[{number:1,title:"Original source",url:"https://example.org/source"}],onVle:{label:"Browse sources",href:"/suppliers?category=Rice"}};
describe("supplied sourcing guide",()=>{
 it("has no factual fallback when the source is absent",()=>{expect(sourcingFaqSchema.parse({groups:[]}).groups).toEqual([]);expect(faqStructuredData({groups:[]}).mainEntity).toEqual([]);});
 it("requires sources and a filtered local search",()=>{
  const parse=(q:unknown)=>sourcingFaqSchema.safeParse({groups:[{id:"rice",questions:[q]}]}).success;
  expect(parse(question)).toBe(true);expect(parse({...question,sources:[]})).toBe(false);
  for(const href of ["https://evil.test/suppliers?q=x","//evil.test/suppliers?q=x","/suppliers","/suppliers?category=","/suppliers?next=x"])expect(parse({...question,onVle:{label:"Browse",href}})).toBe(false);
  expect(parse({...question,sources:[...question.sources,...question.sources]})).toBe(false);
 });
 it("matches the structured answer to visible text, sources and search",()=>{
  const data=sourcingFaqSchema.parse({groups:[{id:"rice",questions:[question]}]});
  const answer=faqStructuredData(data).mainEntity[0];expect(answer.name).toBe(question.question);expect(answer.acceptedAnswer.text).toContain(question.answer);expect(answer.acceptedAnswer.text).toContain("[1] Original source");expect(answer.acceptedAnswer.text).toContain("https://vle.exchange/suppliers?category=Rice");
  expect(safeJsonLd({text:"</script>"})).not.toContain("</script>");
 });
});
