"use client";
import { useState, useTransition } from "react";
import { cancelMyCounselRequest } from "./actions";
export function CancelRequestButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return <span><button type="button" className="link-button" disabled={pending} onClick={() => {
    if (window.confirm("Cancel this meeting request?")) startTransition(async () => setMessage((await cancelMyCounselRequest(id)).message));
  }}>Cancel request</button>{message && <small role="status">{message}</small>}</span>;
}
