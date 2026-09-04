"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  no_code: "That link is missing information it needs — it may have been forwarded or copied incorrectly, or already used. Please request a new one.",
  link_error: "That link has expired or was already used. Please request a new one.",
  exchange_failed: "That link didn't work — it may have expired or already been used. Please request a fresh one below.",
  no_session: "We verified your link but couldn't start your session. Please try again — if it keeps happening, let the church office know.",
  session_not_found: "Your session expired before you could set a password. Please request a new reset link.",
  auth_failed: "That link didn't work or has expired. Please request a new one.",
};

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/member";
  const callbackError = searchParams.get("error");
  const callbackErrorMessage = callbackError ? CALLBACK_ERROR_MESSAGES[callbackError] ?? "Something went wrong with that link. Please try again." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setError(
        error.message.toLowerCase().includes("invalid")
          ? "That email and password don't match an account. If you're new here, check with the church office — accounts are set up by invitation."
          : error.message,
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="clay-form" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
      {callbackErrorMessage && <div className="alert warn">{callbackErrorMessage}</div>}
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
      {status === "error" && <div className="alert warn">{error}</div>}
      <button type="submit" className="primary-button" disabled={status === "submitting"} style={{ width: "100%", justifyContent: "center" }}>
        {status === "submitting" ? "Signing in…" : "Sign in"}
      </button>
      <p className="form-note" style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <p className="form-note" style={{ marginTop: 8 }}>
        New here? <Link href="/join">Request to join the church</Link> and we&apos;ll set up your account.
      </p>
    </form>
  );
}
