import {env} from 'cloudflare:workers';
import {tecridEmailRelay} from '../../../server/tecrid-email-relay';
export const dynamic='force-dynamic';
export async function POST(request:Request){return tecridEmailRelay(request,env);}
