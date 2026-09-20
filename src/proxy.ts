import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { apexUrlFromRequest, skipsClerkHandshake } from "@/lib/site";

const clerk = clerkMiddleware();

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const apexUrl = apexUrlFromRequest(request.headers.get("host"), request.url);
  if (apexUrl) {
    return NextResponse.redirect(apexUrl, 301);
  }

  const { pathname } = request.nextUrl;
  if (skipsClerkHandshake(pathname)) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "index, follow");
    return response;
  }

  return clerk(request, event);
}

export const config = {
  matcher: [
    // Keep crawler files and static assets off the Clerk/handshake path.
    "/((?!_next|robots\\.txt|sitemap\\.xml|sitemap_index\\.xml|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)",
    "/(api|trpc)(.*)",
  ],
};
