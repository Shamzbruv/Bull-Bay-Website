"use client";
import { useState, useTransition } from "react";
import { cancelMyCounselRequest } from "./actions";
import { useConfirm } from "@/components/dialog-provider";
export function CancelRequestButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirm();
  return <span><button type="button" className="link-button" disabled={pending} onClick={async () => {
    if (await confirm({ message: "Cancel this meeting request?", confirmLabel: "Cancel request", danger: true })) startTransition(async () => setMessage((await cancelMyCounselRequest(id)).message));
  }}>Cancel request</button>{message && <small role="status">{message}</small>}</span>;
}
