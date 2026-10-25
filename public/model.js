export const KEY='vle-public-v2';
export const brand={id:'workspace-brand',name:'Your brand',person:'Brand buyer',email:'',initials:'B'};
export const suppliers=[{id:'kasandrinos',name:'Kasandrinos',person:'Supplier onboarding pending',initials:'K',category:'Olive oil',country:'Greece',real:true}];
export const analytes=['Lead','Cadmium','Total arsenic','Mercury'];
export const categories=['Olive oil','Cocoa','Tea and matcha','Protein','Spices','Rice'];
export let lots=[]; export function setLots(next){lots=next;}
export const stages=['Interest','Pricing shared','Sample requested','Sample shipped','TECRID result attached','Qualified','Reserved'];
export const supplierFor=id=>suppliers.find(s=>s.id===id);
export const canPublish=l=>!!(l.coa&&(l.real?l.matched:l.confirmed)&&l.id&&l.coaLot===l.id);
export function allLots(){return lots.filter(l=>l.real&&l.supplier==='kasandrinos'&&canPublish(l));}
export function match(l,limits){if(l.real&&!l.confirmed)return 'Awaiting supplier confirmation';let unknown=false;for(let i=0;i<limits.length;i++){const v=l.values[i];if(v.q==='<'&&(v.rl==null||v.rl>limits[i]))unknown=true;else if(v.q!=='<'&&v.value>limits[i])return 'Does not meet your limits';}return unknown?'Cannot determine':'Meets your limits';}
export function canSeeDeal(s,d){return !!d&&((s.role==='brand'&&d.brand===brand.id)||(s.role==='supplier'&&d.supplier===s.supplier));}
export function now(){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Nicosia'}).format(new Date()).replace(',',' ·');}
export function nextAction(d){if(d.stage===6)return {role:null,text:'Soft hold confirmed',action:null};if(d.reservation?.status==='Requested')return {role:'supplier',text:'Confirm the soft hold',action:'confirm-reservation'};return [{role:'supplier',text:'Share pricing',action:'quote'},{role:'brand',text:'Request a sample',action:'sample'},{role:'supplier',text:d.costAgreed?'Mark sample shipped':'Agree on sample costs',action:d.costAgreed?'ship':'costs'},{role:'brand',text:'Attach the sample result',action:'test'},{role:'brand',text:'Review and qualify the lot',action:'qualify'},{role:'brand',text:'Request a soft hold',action:'reserve'}][d.stage];}
