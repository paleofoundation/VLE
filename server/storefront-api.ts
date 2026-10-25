import {canEditKas} from './teams.js';
import {storefrontDefaults,validateStorefront,storefrontRecord,canManageStorefront,publicStorefront,usesAsset} from './storefront.js';
import {privateHeaders,failure} from './access';
const json=(value:any,status=200)=>Response.json(value,{status,headers:privateHeaders});
const uploadPath=/^\/api\/storefront-assets\/([a-f0-9-]{36}\.(?:png|jpg|webp))$/;
export async function storefrontRequest(request:Request,db:any,bucket:any,user:any,p:any){
 const path=new URL(request.url).pathname;
 let row=await storefrontRecord(db);
 const allowed=canManageStorefront(user,p.owner,row)||await canEditKas(db,user);
 if(request.method==='GET'&&uploadPath.test(path)){
  const published=publicStorefront(row);
  if(!usesAsset(published,path)&&!allowed)return failure('Image not found',404);
  const object=await bucket.get('storefront/kasandrinos/'+path.split('/').at(-1));
  if(!object)return failure('Image not found',404);
  return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'image/jpeg','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
 }
 if(!user)return failure('Sign in with the authorized supplier email to edit this storefront.',401);
 if(!allowed)return failure('Only the site owner or the designated Kasandrinos manager can edit this storefront.',403);
 const view=()=>({draft:row?.draft?JSON.parse(row.draft):structuredClone(storefrontDefaults),published:publicStorefront(row),revision:row?.revision||0,updatedAt:row?.updated_at||null,canPublish:true,canAssignManager:false,managerEmail:p.owner?(row?.manager_email||''):undefined});
 if(request.method==='GET')return json(view());
 if(request.method!=='POST')return failure('Not found',404);
 if(request.headers.get('origin')!==new URL(request.url).origin)return failure('Same-origin request required.',403);
 if(path==='/api/storefront/upload'){
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))return failure('Choose an image file.',415);
  if(Number(request.headers.get('content-length'))>6_300_000)return failure('Images must be smaller than 6 MB.',413);
  const form=await request.formData(),file=form.get('image');
  if(!(file instanceof File)||file.size>6_000_000||file.size<12)return failure('Choose a PNG, JPEG or WebP image under 6 MB.',400);
  const data=new Uint8Array(await file.arrayBuffer());
  const mime=data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71?'image/png':data[0]===255&&data[1]===216&&data[2]===255?'image/jpeg':new TextDecoder().decode(data.slice(0,4))==='RIFF'&&new TextDecoder().decode(data.slice(8,12))==='WEBP'?'image/webp':null;
  if(!mime)return failure('Use PNG, JPEG or WebP. PDFs belong in the lot document workflow.',415);
  const ext=mime==='image/png'?'png':mime==='image/jpeg'?'jpg':'webp',id=crypto.randomUUID()+'.'+ext;
  await bucket.put('storefront/kasandrinos/'+id,data,{httpMetadata:{contentType:mime}});
  return json({url:'/api/storefront-assets/'+id});
 }
 if(!request.headers.get('content-type')?.startsWith('application/json'))return failure('JSON required',415);
 const raw=await request.text();if(raw.length>24000)return failure('Request too large',413);
 const data=JSON.parse(raw);
 if(data.revision!==(row?.revision||0))return failure('The storefront changed in another tab. Reload before saving.',409);
 // Initialize only after authorization. Draft changes are never public until publish.
 if(!row){await db.prepare('INSERT OR IGNORE INTO supplier_storefronts (supplier,draft,revision,updated_at) VALUES (?,?,0,?)').bind('kasandrinos',JSON.stringify(storefrontDefaults),new Date().toISOString()).run();row=await storefrontRecord(db);}
 let result;
 const at=new Date().toISOString();
 if(data.action==='save'||data.action==='publish'){
  const profile=validateStorefront(data.profile);
  // Uploaded references must exist in this supplier’s bucket namespace.
  for(const image of [profile.hero,profile.banner,profile.logo,profile.storyImage,...profile.gallery])if(image.startsWith('/api/')){const asset=await bucket.head('storefront/kasandrinos/'+image.split('/').at(-1));if(!asset)return failure('An uploaded image is missing. Upload it again before saving.',400);}
  const body=JSON.stringify(profile);
  result=data.action==='publish'?await db.prepare('UPDATE supplier_storefronts SET draft=?,published=?,revision=revision+1,updated_at=? WHERE supplier=? AND revision=?').bind(body,body,at,'kasandrinos',data.revision).run():await db.prepare('UPDATE supplier_storefronts SET draft=?,revision=revision+1,updated_at=? WHERE supplier=? AND revision=?').bind(body,at,'kasandrinos',data.revision).run();
 }else if(data.action==='manager'){
  if(!p.owner)return failure('Only the site owner can designate the supplier manager.',403);
  const email=String(data.email||'').trim().toLowerCase();
  if(!/^[^\s@<>]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)||email.length>254)return failure('Enter the manager’s email address.',400);
  result=await db.prepare('UPDATE supplier_storefronts SET manager_email=?,revision=revision+1,updated_at=? WHERE supplier=? AND revision=?').bind(email,at,'kasandrinos',data.revision).run();
 }else return failure('Unknown storefront action',400);
 if(result.meta.changes!==1)return failure('The storefront changed in another tab. Reload before saving.',409);
 row=await storefrontRecord(db);return json(view());
}
