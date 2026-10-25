import {env} from 'cloudflare:workers';
import {notificationService} from '../../../server/kasandrinos-notification-service';
export const dynamic='force-dynamic';
export async function POST(request:Request){return notificationService(request,env);}
