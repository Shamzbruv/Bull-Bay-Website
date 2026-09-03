"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm({ forced }: { forced: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setError("Please use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("Passwords don't match.");
      return;
    }
    setStatus("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    // Clear the forced-change flag now that they've set a real password.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("auth_user_id", user.id);
    }
    router.push("/member");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="clay-form" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
      {forced && (
        <div className="alert info" style={{ marginBottom: 20 }}>
          For security, please set your own password before continuing.
        </div>
      )}
      <label>
        New password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      {status === "error" && <div className="alert warn">{error}</div>}
      <button type="submit" className="primary-button" disabled={status === "submitting"} style={{ width: "100%", justifyContent: "center" }}>
        {status === "submitting" ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
