import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { getCurrentActor } from "@/lib/current-actor";
import { downloadContaminantDocument } from "@/services/contaminants";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentActor();
    const id = z.string().uuid().parse((await params).id);
    const document = await downloadContaminantDocument(actor, id);
    const filename = document.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
    return new Response(new Uint8Array(document.fileContent!), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : ["FORBIDDEN", "TENANT_MISMATCH", "NO_MEMBERSHIP"].includes(error.code) ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
      return Response.json({ error: error.message }, { status, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid document identifier" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
