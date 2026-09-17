"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  no_code: "That link is missing information it needs — it may have been forwarded or copied incorrectly, or already used. Please request a new one.",
  link_error: "That link has expired or was already used. Please request a new one.",
  exchange_failed: "That link didn't work — it may have expired or already been used. Please request a fresh one below.",
  no_session: "We verified your link but couldn't start your session. Please try again — if it keeps happening, let the church office know.",
  session_not_found: "Your session expired before you could set a password. Please request a new reset link.",
  auth_failed: "That link didn't work or has expired. Please request a new one.",
};

/** `next` arrives already sanitised by safeNextPath() in the page. */
/**
 * Supabase's own error strings are written for developers — "Email not
 * confirmed", "over_request_rate_limit" — and members were being shown
 * them verbatim. Matched on `code` where there is one, since the message
 * text is not stable across releases and is not translated.
 */
function signInMessage(error: { code?: string; message: string }) {
  const code = error.code ?? "";
  if (code === "invalid_credentials" || error.message.toLowerCase().includes("invalid")) {
    return "That email and password don't match an account. If you're new here, check with the church office — accounts are set up by invitation.";
  }
  if (code === "email_not_confirmed") {
    return "Your email address hasn't been confirmed yet. Check your inbox for the invitation we sent, or ask the church office to resend it.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Too many attempts just now. Please wait a few minutes and try again.";
  }
  if (code === "user_banned") {
    return "This account isn't active. Please contact the church office.";
  }
  return "We couldn't sign you in just now. Please try again — if it keeps happening, let the church office know.";
}

export function LoginForm({ next, callbackError }: { next: string; callbackError: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();
  const callbackErrorMessage = callbackError ? CALLBACK_ERROR_MESSAGES[callbackError] ?? "Something went wrong with that link. Please try again." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const supabase = createClient();
      // A network hiccup shouldn't leave the button stuck on "Signing
      // in…" forever with no way out — race the real call against a
      // timeout so there's always a next step, even if Supabase Auth or
      // the network stalls rather than actually failing.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000),
      );
      const { error } = await Promise.race([supabase.auth.signInWithPassword({ email, password }), timeout]);
      if (error) {
        setStatus("error");
        setError(signInMessage(error));
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setStatus("error");
      setError("That took too long and didn't go through. Please check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="clay-form" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
      {callbackErrorMessage && <div className="alert warn" role="alert">{callbackErrorMessage}</div>}
      <label>
        Email address
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {status === "error" && <div className="alert warn" role="alert">{error}</div>}
      <button type="submit" className="primary-button" disabled={status === "submitting"} style={{ width: "100%", justifyContent: "center" }}>
        {status === "submitting" ? "Signing in…" : "Sign in"}
      </button>
      <p className="form-note" style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <div
        style={{
          marginTop: 18,
          padding: "16px 18px",
          borderRadius: 14,
          background: "rgba(214,173,87,.14)",
          border: "1px solid rgba(214,173,87,.45)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 10px", fontSize: ".85rem", color: "var(--color-blue-700)", fontWeight: 700 }}>
          New here? We&apos;d love to have you.
        </p>
        <Link className="primary-button compact" href="/join" style={{ justifyContent: "center", width: "100%" }}>
          Request to join the church <span>→</span>
        </Link>
      </div>
    </form>
  );
}
