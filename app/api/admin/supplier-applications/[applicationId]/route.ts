import {env} from 'cloudflare:workers';
import {getEmailUser} from '../../../../../server/email-auth';
import {supplierApplicationRequest} from '../../../../../server/supplier-onboarding.js';
export const dynamic='force-dynamic';
export async function POST(request:Request){return supplierApplicationRequest(request,env.DB,await getEmailUser(request),env);}
export const DELETE=POST;
