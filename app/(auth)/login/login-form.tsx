"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/member";

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
        Accounts are created by the church office. If you don&apos;t have one yet, contact us through the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </form>
  );
}
