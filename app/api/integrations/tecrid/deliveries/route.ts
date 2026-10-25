import {env} from 'cloudflare:workers';
import {receiveEvidence} from '../../../../../server/proof-exchange.js';
export const dynamic='force-dynamic';
export async function POST(request:Request){return receiveEvidence(request,env.DB,env);}
