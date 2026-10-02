import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const authenticate = clerkMiddleware();
export default function proxy(
  request: NextRequest,
  event: Parameters<typeof authenticate>[1],
) {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.CARCHECK_DEMO === "1"
  )
    return NextResponse.next();
  return authenticate(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
