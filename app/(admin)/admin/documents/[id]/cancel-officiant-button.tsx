"use client";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/dialog-provider";
import { cancelOfficiant } from "../actions";
export function CancelOfficiantButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition(); const [message, setMessage] = useState(""); const confirm = useConfirm();
  return <><button type="button" className="secondary-button" disabled={pending} onClick={async () => {
    if (await confirm({ title: "Cancel officiating pastor request?", message: "This removes their signature and disables their link. Certification will use the usual church pastor workflow.", confirmLabel: "Cancel request" })) start(async () => setMessage((await cancelOfficiant(requestId)).message));
  }}>Cancel request and use church pastor</button><p role="status">{message}</p></>;
}
