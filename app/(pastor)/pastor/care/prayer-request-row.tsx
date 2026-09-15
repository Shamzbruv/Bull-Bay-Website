"use client";

import { useState, useTransition } from "react";
import { assignPrayerRequest, updatePrayerStatus } from "../actions";

type Props = {
  id: string;
  name: string;
  body: string;
  visibility: string;
  status: string;
  createdAt: string;
  assignedTo: string | null;
  assignees: { userId: string; name: string }[];
  canAssign?: boolean;
  completionNote?: string | null;
};

export function PrayerRequestRow({ id, name, body, visibility, status, createdAt, assignedTo, assignees, canAssign = true, completionNote }: Props) {
  const [value, setValue] = useState(status);
  const [assignee, setAssignee] = useState(assignedTo ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <article className="request-row">
      <div className="request-row-copy">
        <div className="button-row">
          <span className="badge gray">{visibility}</span>
          <small>{new Date(createdAt).toLocaleDateString("en-JM", { dateStyle: "medium" })}</small>
        </div>
        <p>{body}</p>
        <b>{name}</b>
        {completionNote && <p><strong>Completion update:</strong> {completionNote}</p>}
      </div>
      <span className="inline-action">
        {canAssign && !["prayed","closed"].includes(value) && <label>
          <span className="sr-only">Assign prayer request</span>
          <select
            value={assignee}
            disabled={pending}
            onChange={(event) => {
              const previous = assignee;
              const next = event.target.value;
              setAssignee(next);
              setMessage(null);
              startTransition(async () => {
                const result = await assignPrayerRequest(id, next);
                setMessage(result.message);
                if (result.status === "error") setAssignee(previous);
                else if (next) setValue("in_progress");
              });
            }}
          >
            <option value="">Unassigned</option>
            {assignees.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}
          </select>
        </label>}
        <span className="badge gold">{value.replaceAll("_", " ")}</span>
        {(canAssign ? value === "awaiting_review" : value === "in_progress") && <button type="button" className="primary-button compact" disabled={pending} onClick={() => startTransition(async () => {
          const next = canAssign ? "prayed" : "awaiting_review";
          const result = await updatePrayerStatus(id,next);setMessage(result.message);if(result.status === "success") setValue(next);
        })}>{canAssign ? "Approve prayer completion" : "Submit completion to Pastor"}</button>}
        {canAssign && value === "awaiting_review" && <button type="button" className="secondary-button compact" disabled={pending} onClick={() => startTransition(async () => {
          const result = await updatePrayerStatus(id,"in_progress");setMessage(result.message);if(result.status === "success")setValue("in_progress");
        })}>Return for follow-up</button>}
        {message && <small role="status">{message}</small>}
      </span>
    </article>
  );
}
