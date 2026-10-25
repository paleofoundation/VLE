export const requestKinds=['spec','coa','tecrid','certification','price','sample'];
export const quickReplies=['Yes','No','Need more time','Ask me later'];
export class RequestError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function text(value,label,max=120){if(typeof value!=='string'||!value.trim()||value.length>max)throw new RequestError('Choose a valid '+label+'.');return value.trim();}
export function accountId(value){const id=text(value,'account',120);if(!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id))throw new RequestError('Invalid account.');return id;}
export function ingredientCode(value){const id=text(value,'ingredient',80);if(!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new RequestError('Invalid ingredient.');return id;}
export function version(value){if(!Number.isSafeInteger(value)||value<0)throw new RequestError('A current record version is required.');return value;}
export function requestInput(input){
 const id=text(input.id,'request identifier',36);if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id))throw new RequestError('A request UUID is required.');
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>6||input.items.some(k=>!requestKinds.includes(k)))throw new RequestError('Choose what you need.');
 if(!['one','list','all_verified'].includes(input.targetMode))throw new RequestError('Choose who should answer.');
 const items=[...new Set(input.items)].sort();
 const targets=input.targetMode==='all_verified'?[]:[...new Set((Array.isArray(input.targets)?input.targets:[]).map(accountId))].sort();
 if(input.targetMode==='all_verified'&&input.targets?.length)throw new RequestError('Every verified supplier uses the current reviewed catalog.');
 if(input.targetMode!=='all_verified'&&(!targets.length||targets.length>100||input.targetMode==='one'&&targets.length!==1))throw new RequestError('Choose one supplier or a list of up to 100.');
 return {id,ingredientCode:ingredientCode(input.ingredientCode),items,targetMode:input.targetMode,targets};
}
export function answerInput(input){
 const revision=version(input.version);
 if(input.reply!=null&&!quickReplies.includes(input.reply))throw new RequestError('Choose a quick reply.');
 if(!Array.isArray(input.assetRefs)||input.assetRefs.length>20||input.assetRefs.some(x=>typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x)))throw new RequestError('Choose current records on file.');
 const assetRefs=[...new Set(input.assetRefs)].sort();
 if(Boolean(input.reply)===Boolean(assetRefs.length))throw new RequestError('Choose a quick reply or records on file.');
 return {version:revision,reply:input.reply||null,assetRefs};
}
export async function fingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
