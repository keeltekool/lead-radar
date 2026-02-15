import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/lead(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/lead(.*)",
  "/api/search(.*)",
  "/api/lead(.*)",
  "/api/photo(.*)",
  "/api/health(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return;
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
