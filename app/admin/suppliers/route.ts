import {env} from 'cloudflare:workers';
import {getEmailUser} from '../../../server/email-auth';
import {isSupplierAdmin} from '../../../server/supplier-onboarding.js';
import {onboardingPage} from '../../../server/onboarding-pages.js';
export async function GET(request:Request){const user=await getEmailUser(request);if(!user)return Response.redirect(new URL('/email-sign-in?return_to=%2Fadmin%2Fsuppliers',request.url),302);if(!isSupplierAdmin(user,env))return new Response('Administrator access required.',{status:403,headers:{'Cache-Control':'no-store'}});return new Response(onboardingPage(true),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie'}});}
