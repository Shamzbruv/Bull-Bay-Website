"use client";

import { useState } from "react";

export function DownloadButton({ requestId }: { requestId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    const res = await fetch(`/api/me/documents/${requestId}/url`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    window.location.href = data.url;
    setStatus("idle");
  }

  return (
    <button type="button" className="secondary-button compact" onClick={handleClick} disabled={status === "loading"}>
      {status === "loading" ? "Preparing…" : status === "error" ? "Try again" : "Download PDF"}
    </button>
  );
}
