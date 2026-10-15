import { notFound } from "next/navigation";
import { buildKasandrinosCompliancePack, getPreviewLot, kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!kasandrinosPreviewEnabled()) notFound();
  const { slug } = await context.params;
  if (slug !== "227-k-b" || !getPreviewLot(slug)) notFound();
  const pack = buildKasandrinosCompliancePack();
  return new Response(`${JSON.stringify(pack, null, 2)}\n`, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "attachment; filename=\"vle-preview-227-k-b-compliance-pack.json\"",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
