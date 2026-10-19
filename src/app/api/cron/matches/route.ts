import {refreshRequirementAlerts} from "@/services/saved-requirements";
export async function GET(req:Request){const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return new Response("Unauthorized",{status:401});return Response.json(await refreshRequirementAlerts());}
