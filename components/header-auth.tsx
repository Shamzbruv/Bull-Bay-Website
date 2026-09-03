"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function AccountIcon({ signedIn }: { signedIn: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none">
      <circle cx="12" cy="8.25" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.75 19c.5-3.25 2.58-5 6.25-5s5.75 1.75 6.25 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {signedIn && (
        <>
          <circle cx="18.25" cy="17.75" r="2.75" fill="currentColor" />
          <path d="m16.9 17.75.85.85 1.75-1.8" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

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
    <Link
      href={signedIn ? "/member" : "/login"}
      className="header-account-link"
      aria-label={signedIn ? "Open my church account" : "Member login"}
      data-auth-state={signedIn ? "signed-in" : "signed-out"}
    >
      <span className="header-account-icon">
        <AccountIcon signedIn={signedIn} />
      </span>
      <span className="header-account-label">{signedIn ? "My Account" : "Member Login"}</span>
    </Link>
  );
}
