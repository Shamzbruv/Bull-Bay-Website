"use client";

import { useState } from "react";

/**
 * A value the administrator has to paste into Google Cloud exactly, with a
 * button to copy it. Typing a redirect URI by hand is the single most common
 * way this setup fails — Google matches it character for character, and a
 * missing "s" in https or a trailing slash produces a redirect_uri_mismatch
 * error with nothing in the church's own logs to explain it.
 */
export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (an insecure origin, or a browser
      // permission prompt that was dismissed). The value is on screen and
      // selectable either way, so say nothing and let them select it.
    }
  }

  return (
    <div className="copy-field">
      <span className="copy-field-label">{label}</span>
      <div className="copy-field-row">
        <code>{value}</code>
        <button type="button" className="secondary-button compact" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
