import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/org";

// Built from SITE_URL, not request.url — see auth/callback/route.ts for why.
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(SITE_URL);
}
