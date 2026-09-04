"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Invite/recovery links from generateAuthLink() (lib/supabase/generate-link.ts)
 * arrive here with the session in the URL FRAGMENT — #access_token=...&refresh_token=...
 * — not a ?code= query param. That's inherent to admin-minted links: PKCE's
 * code-exchange needs a code_verifier the browser stashed when IT initiated
 * the flow, and nothing did here (the link was minted server-side, by the
 * admin, with no browser involved yet) — so GoTrue falls back to handing
 * the session straight over instead.
 *
 * Fragments never reach the server (the browser strips them before the
 * HTTP request is even sent), so this has to run client-side: read the
 * hash, hand it to the browser Supabase client, let @supabase/ssr persist
 * it to cookies the same way sign-in already does, then move on to `next`.
 * A ?code= param is still handled too, in case anything ever does arrive
 * that way.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next") ?? "/member";

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const supabase = createClient();
      const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description") || hashParams.get("error");
      const code = searchParams.get("code");

      if (hashError) {
        if (!cancelled) setError("link_error");
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (cancelled) return;
        if (sessionError) {
          setError("exchange_failed");
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError("exchange_failed");
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      if (!cancelled) setError("no_code");
    }

    complete();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    if (typeof window !== "undefined") {
      window.location.replace(`/login?error=${error}`);
    }
    return (
      <div className="auth-card">
        <h1>That link didn&apos;t work</h1>
        <p className="lead">Taking you back to sign in…</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Signing you in…</h1>
      <p className="lead">One moment.</p>
    </div>
  );
}
