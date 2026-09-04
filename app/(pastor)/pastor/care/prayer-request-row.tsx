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
};

export function PrayerRequestRow({ id, name, body, visibility, status, createdAt, assignedTo, assignees, canAssign = true }: Props) {
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
      </div>
      <span className="inline-action">
        {canAssign && <label>
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
        <label>
          <span className="sr-only">Prayer request status</span>
          <select
            value={value}
            disabled={pending}
            onChange={(event) => {
              const previous = value;
              const next = event.target.value;
              setValue(next);
              setMessage(null);
              startTransition(async () => {
                const result = await updatePrayerStatus(id, next);
                setMessage(result.message);
                if (result.status === "error") setValue(previous);
              });
            }}
          >
            <option value="new">New</option>
            <option value="in_progress">In prayer / assigned</option>
            <option value="prayed">Prayed for</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        {message && <small role="status">{message}</small>}
      </span>
    </article>
  );
}
