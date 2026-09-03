"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const supabase = createClient();
    // Always show the same success state regardless of whether the email
    // exists — this is a public form and shouldn't reveal who has an
    // account (accounts are invitation-only in the first place).
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
    });
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="alert success">
        If <b>{email}</b> has an account with us, a password reset link is on its way. Check your inbox (and spam
        folder).
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
      <button type="submit" className="primary-button" disabled={status === "submitting"} style={{ width: "100%", justifyContent: "center" }}>
        {status === "submitting" ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
