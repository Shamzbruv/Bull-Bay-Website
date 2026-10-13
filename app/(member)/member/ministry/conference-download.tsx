"use client";

import { useState } from "react";

export function ConferenceDownload() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const [message, setMessage] = useState("");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/me/conference-document", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "The download could not be prepared.");
      window.location.href = data.url;
      setStatus("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Download unavailable. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div>
      <button type="button" className="primary-button compact" onClick={handleClick} disabled={status === "loading"}>
        {status === "loading" ? "Preparing…" : "Download Conference Document"}
      </button>
      {status === "error" && <p className="form-note" role="alert">{message}</p>}
    </div>
  );
}
