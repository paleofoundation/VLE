import {env} from 'cloudflare:workers';
import {importTranscripts} from '../../../server/tecrid-report-service';
export const dynamic='force-dynamic';
export async function POST(request:Request){return importTranscripts(request,env);}
