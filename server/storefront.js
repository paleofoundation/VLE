// Supplier presentation is separate from lot evidence and commercial access.
export const storefrontDefaults={
 tagline:'Good oil. Deep roots.',
 intro:'Organic extra virgin olive oil from the Kasandrinos family’s home in Laconia, Greece. Meet the people behind it. Find the format for your business. Know the lot you are considering.',
 hero:'/assets/kas-table.jpg',heroAlt:'Official Kasandrinos photograph of olive oil, olives and citrus',
 banner:'/assets/kas-brand-banner.png',logo:'/assets/kasandrinos-logo.png',
 storyTitle:'A family name. A place to call home.',
 story:'For Tony and Effi Kasandrinos, olive oil starts with family. Their roots are in Niata, Laconia, where the family has tended olive trees for generations. They founded Kasandrinos to share that connection to Greece through the food they grew up with.',
 storyImage:'/assets/kas-family.png',storyImageAlt:'Kasandrinos family portrait in an olive grove, from the official brand website',
 gallery:['/assets/kas-harvest.jpg','/assets/kasandrinos-grove.jpg','/assets/kas-table.jpg'],
 galleryAlts:['Official Kasandrinos harvest photograph','Official Kasandrinos olive harvest photograph','Kasandrinos olive oil at the table'],
 accent:'teal',sections:['products','story','gallery','evidence'],featured:['KAS-227-KB','KAS-228-KB','KAS-195-KB']
};
export const storefrontSections={products:'Featured formats',story:'Our story',gallery:'From grove to table',evidence:'Lot evidence'};
const knownLots=new Set(['KAS-227-KB','KAS-228-KB','KAS-195-KB','KAS-219-KB','KAS-225-KB','KAS-226-KB']);
const assetPattern=/^\/(?:assets\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp)|api\/storefront-assets\/[a-f0-9-]{36}\.(?:png|jpg|webp))$/;
export function validateStorefront(input){
 if(!input||typeof input!=='object')throw Error('Storefront content is required.');
 const text=(key,max)=>{const v=input[key];if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Check '+key+' (maximum '+max+' characters).');return v.trim();};
 const image=key=>{const v=input[key];if(typeof v!=='string'||!assetPattern.test(v))throw Error('Choose or upload a valid '+key+' image.');return v;};
 if(!['teal','lavender','sunlight'].includes(input.accent))throw Error('Choose a brand palette.');
 if(!Array.isArray(input.sections)||input.sections.length!==4||new Set(input.sections).size!==4||input.sections.some(v=>!Object.hasOwn(storefrontSections,v)))throw Error('Keep each storefront section once.');
 if(!Array.isArray(input.featured)||!input.featured.length||input.featured.length>6||new Set(input.featured).size!==input.featured.length||input.featured.some(id=>!knownLots.has(id)))throw Error('Feature only documented Kasandrinos lots.');
 if(!Array.isArray(input.gallery)||input.gallery.length>6||input.gallery.length<1||input.gallery.some(v=>typeof v!=='string'||!assetPattern.test(v)))throw Error('Choose one to six gallery photographs.');
 if(!Array.isArray(input.galleryAlts)||input.galleryAlts.length!==input.gallery.length||input.galleryAlts.some(v=>typeof v!=='string'||!v.trim()||v.length>240))throw Error('Describe every gallery photograph.');
 return {tagline:text('tagline',100),intro:text('intro',600),hero:image('hero'),heroAlt:text('heroAlt',240),banner:image('banner'),logo:image('logo'),storyTitle:text('storyTitle',140),story:text('story',1800),storyImage:image('storyImage'),storyImageAlt:text('storyImageAlt',240),gallery:[...input.gallery],galleryAlts:input.galleryAlts.map(v=>v.trim()),accent:input.accent,sections:[...input.sections],featured:[...input.featured]};
}
export function usesAsset(profile,url){return !!profile&&[profile.hero,profile.banner,profile.logo,profile.storyImage,...profile.gallery].includes(url);}
export async function storefrontRecord(db){return await db.prepare('SELECT draft,published,revision,manager_email,updated_at FROM supplier_storefronts WHERE supplier=?').bind('kasandrinos').first();}
export const canManageStorefront=(user,owner,row)=>!!user&&(owner||!!row?.manager_email&&row.manager_email===user.email.toLowerCase());
export const publicStorefront=row=>row?.published?JSON.parse(row.published):structuredClone(storefrontDefaults);
