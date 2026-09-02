"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

export function MfaEnroll() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  async function loadFactors() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors([...(data?.totp ?? [])]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      if (!cancelled) setFactors([...(data?.totp ?? [])]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnroll() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
  }

  async function verify() {
    if (!factorId) return;
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setStatus("error");
      setMessage(challengeError?.message ?? "Something went wrong.");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("success");
    setMessage("Two-factor authentication is now enabled on your account.");
    setQr(null);
    loadFactors();
  }

  const hasVerifiedFactor = factors.some((f) => f.status === "verified");

  return (
    <div className="panel">
      <h2>Two-factor authentication</h2>
      {hasVerifiedFactor && !qr && <div className="alert success">Two-factor authentication is enabled on your account.</div>}
      {!hasVerifiedFactor && !qr && (
        <>
          <p style={{ color: "var(--color-muted-2)", fontSize: ".88rem" }}>
            Staff, pastoral and admin accounts are required to enable a second factor. Use an authenticator app such
            as Google Authenticator or Authy.
          </p>
          <button type="button" className="primary-button compact" onClick={startEnroll}>
            Set up authenticator app
          </button>
        </>
      )}
      {qr && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Scan this QR code with your authenticator app" style={{ width: 180, height: 180, margin: "16px 0" }} />
          <label>
            Enter the 6-digit code from your app
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} inputMode="numeric" />
          </label>
          <button type="button" className="primary-button compact" onClick={verify}>
            Verify &amp; enable
          </button>
        </div>
      )}
      {status === "error" && <div className="alert warn">{message}</div>}
      {status === "success" && <div className="alert success">{message}</div>}
    </div>
  );
}
