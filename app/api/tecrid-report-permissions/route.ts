import {env} from 'cloudflare:workers';
import {reportPermissions} from '../../../server/tecrid-report-service';
export const dynamic='force-dynamic';
export async function POST(request:Request){return reportPermissions(request,env);}
