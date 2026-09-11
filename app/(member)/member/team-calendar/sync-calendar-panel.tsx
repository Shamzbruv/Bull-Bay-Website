"use client";

import { useState } from "react";

export function SyncCalendarPanel({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = useState(false);
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // the link is still visible to select and copy by hand.
    }
  }

  return (
    <div className="panel">
      <h2>Sync to your phone or Google Calendar</h2>
      <p className="form-note" style={{ marginTop: 0 }}>
        Subscribe once and your working hours and calendar entries below keep showing up automatically — no need to
        re-add them when they change.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <a className="secondary-button compact" href={googleUrl} target="_blank" rel="noreferrer">
          Add to Google Calendar
        </a>
        <a className="secondary-button compact" href={webcalUrl}>
          Add to phone calendar
        </a>
      </div>
      <label>
        Or copy the link directly
        <div style={{ display: "flex", gap: 8 }}>
          <input value={feedUrl} readOnly onFocus={(e) => e.currentTarget.select()} style={{ flex: 1 }} />
          <button type="button" className="secondary-button compact" onClick={copyLink}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </label>
      <p className="form-note" style={{ marginBottom: 0 }}>
        This link is private to you — anyone with it can see your working hours and calendar entries, so only add
        it to your own calendar apps.
      </p>
    </div>
  );
}
