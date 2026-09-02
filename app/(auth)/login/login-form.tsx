"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/member";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="alert success">
        Check <b>{email}</b> for a sign-in link. You can close this tab once you click it.
      </div>
    );
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
      {status === "error" && <div className="alert warn">{error}</div>}
      <button type="submit" className="primary-button" disabled={status === "submitting"} style={{ width: "100%", justifyContent: "center" }}>
        {status === "submitting" ? "Sending link…" : "Send me a sign-in link"}
      </button>
      <p className="form-note" style={{ marginTop: 16 }}>
        No password needed — we&apos;ll email you a secure link. Staff and pastoral accounts also require a second
        factor once enrolled.
      </p>
    </form>
  );
}
