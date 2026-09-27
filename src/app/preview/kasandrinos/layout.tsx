import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { kasandrinosPreviewEnabled } from "@/domain/kasandrinos-preview-path";
import { PreviewBanner } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if (!kasandrinosPreviewEnabled()) {
    return {
      title: "Not found",
      robots: { index: false, follow: false, nocache: true },
    };
  }
  return {
    title: {
      default: "Preview: Kasandrinos",
      template: "%s | VLE preview",
    },
    description: "Preview, not a live listing. Kasandrinos records shown only on this pull-request preview.",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function KasandrinosPreviewLayout({ children }: { children: React.ReactNode }) {
  if (!kasandrinosPreviewEnabled()) notFound();
  return (
    <>
      <PreviewBanner />
      {children}
    </>
  );
}
