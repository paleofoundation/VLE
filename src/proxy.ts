import { clerkMiddleware } from "@clerk/nextjs/server";

// Request authentication is initialized here. Authorization remains colocated
// with every protected page and Server Action so route matching is never the
// sole security boundary.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Keep crawler files and static assets off the Clerk middleware path.
    "/((?!_next|robots\\.txt|sitemap\\.xml|sitemap_index\\.xml|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)",
    "/(api|trpc)(.*)",
  ],
};
