import type { Metadata } from "next";
import { ClerkProvider, UserButton } from "@clerk/nextjs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <div className="workspaceAccount">
        <UserButton />
      </div>
      {children}
    </ClerkProvider>
  );
}
