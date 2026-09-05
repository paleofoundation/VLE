import { clerkMiddleware } from "@clerk/nextjs/server";

// Request authentication is initialized here. Authorization remains colocated
// with every protected page and Server Action so route matching is never the
// sole security boundary.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
