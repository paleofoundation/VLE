import {env} from 'cloudflare:workers';
import {reportAccess} from '../../../server/tecrid-report-service';
export const dynamic='force-dynamic';
export async function POST(request:Request){return reportAccess(request,env);}
