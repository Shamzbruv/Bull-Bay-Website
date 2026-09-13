"use client";

import { useState } from "react";

export function SyncCalendarPanel({ feedUrl, publicFeed = false }: { feedUrl: string; publicFeed?: boolean }) {
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
        Subscribe to see your confirmed meetings and, for pastoral team members, working hours and calendar entries. Updates flow from the church platform to your calendar. Changes made in Google or your phone do not update church availability. Google and other calendar apps refresh subscriptions on their own schedule.
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
        {publicFeed ? "This subscription contains published church events and can be shared." : "This link is private to you — anyone with it can see your calendar entries. Add it only to your own calendar apps."}
      </p>
    </div>
  );
}
