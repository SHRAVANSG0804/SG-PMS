import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/config";

// Everything is private except the landing page and the Clerk auth screens.
// A signed-out visitor to /dashboard (or any app URL) is sent to /sign-in.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

const protect = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

// Keys not set yet (e.g. first deploy): only the landing page is reachable,
// everything else goes back to it — it explains what still needs configuring.
function notConfigured(req: NextRequest) {
  if (req.nextUrl.pathname === "/") return NextResponse.next();
  return NextResponse.redirect(new URL("/", req.url));
}

export default isClerkConfigured() ? protect : notConfigured;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
