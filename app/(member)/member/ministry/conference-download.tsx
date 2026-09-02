"use client";

import { useState } from "react";

export function ConferenceDownload() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    const res = await fetch("/api/me/conference-document", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    window.location.href = data.url;
    setStatus("idle");
  }

  return (
    <div>
      <button type="button" className="primary-button compact" onClick={handleClick} disabled={status === "loading"}>
        {status === "loading" ? "Preparing…" : "Download Conference Document"}
      </button>
      {status === "error" && <p className="form-note">Not available yet — check back soon.</p>}
    </div>
  );
}
