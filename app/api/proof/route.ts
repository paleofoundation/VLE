import {env} from 'cloudflare:workers';
import {getEmailUser} from '../../../server/email-auth';
import {proofRequest} from '../../../server/proof-exchange.js';
export const dynamic='force-dynamic';
export async function GET(request:Request){return proofRequest(request,env.DB,await getEmailUser(request),env);}
export async function POST(request:Request){return proofRequest(request,env.DB,await getEmailUser(request),env);}
