"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Renders the sign-in/profile link based on client-side session state
 * instead of a server cookies() read, so the pages that render <SiteHeader>
 * can be statically cached (see lib/supabase/public.ts). Defaults to the
 * signed-out state on first paint — the same thing an anonymous visitor
 * sees — and swaps in almost immediately on mount for signed-in members
 * (Supabase reads the persisted session locally, no network round trip).
 */
export function HeaderAuth() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <Link href={signedIn ? "/member" : "/login"} className="icon-button" aria-label={signedIn ? "My church account" : "Sign in"}>
      {signedIn ? "☺" : "⇥"}
    </Link>
  );
}
