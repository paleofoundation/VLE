import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { getCurrentActor } from "@/lib/current-actor";
import { exportLotCompliancePack } from "@/services/compliance-pack";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lotId = z.string().uuid().parse(id);
    const pack = await exportLotCompliancePack(await getCurrentActor(), lotId);
    const lotCode = pack.physicalLot.supplierLotCode.replaceAll(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
    const date = pack.generatedAt.slice(0, 10);
    return new Response(`${JSON.stringify(pack, null, 2)}\n`, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="vle-${lotCode}-compliance-pack-${date}.json"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" || error.code === "TENANT_MISMATCH" || error.code === "NO_MEMBERSHIP" ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
      return Response.json({ error: error.message }, { status, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid physical lot identifier" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
