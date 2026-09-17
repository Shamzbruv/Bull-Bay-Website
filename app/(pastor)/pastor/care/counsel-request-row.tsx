"use client";

import { useActionState, useState, useTransition } from "react";
import { declineCounselRequest, scheduleCounselRequest, finishCounselRequest } from "../actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { useConfirm } from "@/components/dialog-provider";

type Props = {
  id: string;
  reason: string;
  requesterName: string;
  details: string | null;
  isUrgent: boolean;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
};

export function CounselRequestRow({ id, reason, requesterName, details, isUrgent, preferredDate, preferredTime, status }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [scheduleState, scheduleAction] = useActionState(scheduleCounselRequest.bind(null, id), initialActionState);
  const [declineState, declineAction] = useActionState(declineCounselRequest.bind(null, id), initialActionState);
  const confirm = useConfirm();

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <b>{reason}</b> — {requesterName}
          {preferredDate && (
            <span style={{ color: "var(--color-muted-2)", fontSize: ".85rem" }}>
              {" "}
              · wants {new Date(`${preferredDate}T12:00:00-05:00`).toLocaleDateString("en-JM", { dateStyle: "medium", timeZone: "America/Jamaica" })}
              {preferredTime && ` at ${preferredTime.slice(0, 5)}`}
            </span>
          )}
          {details && <p style={{ margin: "4px 0 0", fontSize: ".85rem" }}>{details}</p>}
        </div>
        <span>
          {isUrgent && <span className="badge gray" style={{ marginRight: 6 }}>urgent</span>}
          <span className="badge blue">{status}</span>
        </span>
      </div>

      {status === "scheduled" && <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="secondary-button compact" disabled={pending} onClick={() => startTransition(async () => setResult((await finishCounselRequest(id, "completed")).message))}>Mark completed</button>
        <button type="button" className="secondary-button compact" disabled={pending} onClick={async () => { if (await confirm({ message: "Cancel this meeting and free the calendar time?", confirmLabel: "Cancel meeting", danger: true })) startTransition(async () => setResult((await finishCounselRequest(id, "cancelled")).message)); }}>Cancel meeting</button>
      </div>}
      {result && <p role="status">{result}</p>}

      {status === "requested" && !responding && (
        <button type="button" className="secondary-button compact" style={{ marginTop: 8 }} onClick={() => setResponding(true)}>
          Schedule or decline
        </button>
      )}

      {status === "requested" && responding && (
        <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
          <form action={scheduleAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ fontSize: ".8rem" }}>
              Starts
              <input type="datetime-local" name="starts_at" defaultValue={preferredDate && preferredTime ? `${preferredDate}T${preferredTime.slice(0, 5)}` : ""} required style={{ display: "block" }} />
            </label>
            <label style={{ fontSize: ".8rem" }}>
              Ends
              <input type="datetime-local" name="ends_at" required style={{ display: "block" }} />
            </label>
            <SubmitButton pendingLabel="Scheduling…">Schedule</SubmitButton>
          </form>
          <FormStatus state={scheduleState} />

          <form action={declineAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ fontSize: ".8rem", flex: 1, minWidth: 200 }}>
              Note (optional, sent to office records only)
              <input type="text" name="staff_notes" style={{ display: "block", width: "100%" }} />
            </label>
            <button type="submit" className="secondary-button compact">
              Decline
            </button>
          </form>
          <FormStatus state={declineState} />
        </div>
      )}
    </div>
  );
}
