"use client";

import { useState, useTransition } from "react";
import { certifyDocument } from "./actions";

export function CertifyButton({ requestId, canCertify }: { requestId: string; canCertify: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCertify) {
    return (
      <p style={{ fontSize: ".78rem", color: "#a8341f", margin: "8px 0 0" }}>
        Upload your signature (and stamp, if you use one) below before you can certify documents.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="primary-button compact"
        disabled={pending}
        onClick={() => {
          if (!confirm("Certify this document? Your signature and stamp will be applied and it will be sent to the member as a completed PDF.")) return;
          startTransition(async () => {
            const result = await certifyDocument(requestId);
            setMessage(result.message);
          });
        }}
      >
        {pending ? "Certifying…" : "Certify & generate PDF"}
      </button>
      {message && (
        <p style={{ fontSize: ".78rem", marginTop: 6, color: message.startsWith("Certified") ? "var(--color-olive-700)" : "#a8341f" }}>
          {message}
        </p>
      )}
    </div>
  );
}
