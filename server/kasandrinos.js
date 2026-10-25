import testReferences from './tecrid-test-references.json' with {type:'json'};
import reports from './kasandrinos-reports.json' with {type:'json'};
export const kasReports=reports;
export const kasSupplier={id:'kasandrinos',name:'Kasandrinos',country:'Greece',category:'Olive oil',accountStatus:'Connected supplier team',firstRealSupplier:true};
const formats={'227 K/B':['250 mL bottle','Olive Oil 250ml Bottle'],'228 K/B':['3 L can','Olive Oil 3L Can'],'195 K/B':['3 L bag in a box','Olive Oil 3L Bag in a Box']};
export const kasLots=['227 K/B','228 K/B','195 K/B','219 K/B','225 K/B','226 K/B'].map(lotNumber=>{
 const linked=reports.filter(r=>r.lotNumbers.includes(lotNumber));
 const [packaging,sample]=formats[lotNumber]||['Not stated in report','Olive oil'];
 return {id:'KAS-'+lotNumber.split(' ')[0]+'-KB',lotNumber,supplier:'kasandrinos',real:true,product:'Organic extra virgin olive oil',category:'Olive oil',origin:'Greece',packaging,sample,coa:true,confirmed:false,matched:linked.length>0,coaLot:'KAS-'+lotNumber.split(' ')[0]+'-KB',reports:linked.map(r=>r.id),lab:[...new Set(linked.map(r=>r.lab))].join(' · '),date:linked.map(r=>r.date).sort().at(-1),cert:'Organic · Supplier-reported',analytes:[],photo:'kasandrinos',valuesStatus:'Awaiting supplier confirmation',availability:'Not confirmed',primaryReport:linked[0].id};
});
export function tecridTestReference(report){
 const match=testReferences.find(r=>r.reportNumber===report.reportNumber && r.sourceIssuer===report.lab && r.sourceSha256===report.sha256 && report.lotNumbers.length===1 && report.lotNumbers[0]===r.lotNumber && report.sample===r.sampleName);
 if(!match)return null;
 return {testIdentifier:match.testIdentifier,resolverUrl:match.resolverUrl,jsonUrl:match.jsonUrl,sandbox:true,productionAuthority:false,productionTecrid:null,laboratoryConfirmation:'pending'};
}
export function kasCatalog(){
 // Intentionally omit original URLs, file details, hashes, extracted results and contacts.
 const publicReports=reports.map(report=>{const {sourceURL,sha256,bytes,file,...metadata}=report;return {...metadata,tecridTest:tecridTestReference(report)};});
 return {supplier:kasSupplier,lots:kasLots,reports:publicReports,importedAt:'2026-10-21',valuesStatus:'Awaiting supplier confirmation'};
}
export async function reportBytes(report,bucket,transport=fetch){
 const key='kasandrinos/source-reports/'+report.sha256+'.pdf';
 const cached=bucket?await bucket.get(key):null;
 if(cached)return cached.body;
 const response=await transport(report.sourceURL,{redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('The source report is temporarily unavailable.');
 if(Number(response.headers.get('content-length'))>12_000_000)throw Error('Unexpected report size.');
 const data=await response.arrayBuffer();
 if(data.byteLength!==report.bytes||new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw Error('The source report has changed and needs review.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==report.sha256)throw Error('The source report has changed and needs review.');
 if(bucket)await bucket.put(key,data,{httpMetadata:{contentType:'application/pdf'},customMetadata:{sha256:hash,reportId:report.id}});
 return data;
}
