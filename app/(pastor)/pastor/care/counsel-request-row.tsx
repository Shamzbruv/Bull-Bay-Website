"use client";

import { useActionState, useState } from "react";
import { declineCounselRequest, scheduleCounselRequest } from "../actions";
import { initialActionState } from "@/app/(public)/actions";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

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
  const [responding, setResponding] = useState(false);
  const [scheduleState, scheduleAction] = useActionState(scheduleCounselRequest.bind(null, id), initialActionState);
  const [declineState, declineAction] = useActionState(declineCounselRequest.bind(null, id), initialActionState);

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <b>{reason}</b> — {requesterName}
          {preferredDate && (
            <span style={{ color: "var(--color-muted-2)", fontSize: ".85rem" }}>
              {" "}
              · wants {new Date(preferredDate).toLocaleDateString("en-JM", { dateStyle: "medium" })}
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
              <input type="datetime-local" name="starts_at" required style={{ display: "block" }} />
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
