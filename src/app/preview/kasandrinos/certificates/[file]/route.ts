import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { kasandrinosPdfFileName, kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  if (!kasandrinosPreviewEnabled()) notFound();
  const { file } = await context.params;
  const fileName = kasandrinosPdfFileName(file);
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) notFound();
  const root = path.join(process.cwd(), "fixtures", "kasandrinos", "pdfs");
  const fullPath = path.join(root, fileName);
  if (path.dirname(fullPath) !== root) notFound();
  const bytes = await readFile(fullPath);
  return new Response(bytes, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `inline; filename="${fileName.replaceAll("\"", "")}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
