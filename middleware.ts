import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization,
     * so the auth session cookie stays fresh across the app.
     *
     * The Live Countdown's API is left out: its screens hold connections
     * open for hours, the control panel sends a change for every step of a
     * volume slider, and media uploads run to 50 MB, which proxy body
     * buffering (10 MB) would cut short. Those routes check the sign-in
     * themselves (lib/tools/access.ts).
     */
    "/((?!_next/static|_next/image|favicon.ico|tools/live/api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
