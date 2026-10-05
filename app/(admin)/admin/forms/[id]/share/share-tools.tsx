"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useConfirm } from "@/components/dialog-provider";
import type { Question } from "@/lib/forms/schema";
import { cancelInvitation, remindInvitation, sendFormInvitations } from "../../actions";

function base64Url(text: string) {
  let binary = "";
  new TextEncoder().encode(text).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function PrefillBuilder({ link, questions }: { link: string; questions: Question[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  if (!questions.length) return <p className="fb-hint">This form has no questions that can be pre-filled.</p>;
  const filled = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim() !== ""));
  const url = Object.keys(filled).length ? `${link}?prefill=${base64Url(JSON.stringify(filled))}` : link;
  return (
    <div className="fb-prefill">
      {questions.map((q) => (
        <label key={q.id} className="fb-field">
          <span>{q.title}</span>
          {"options" in q ? (
            <select value={values[q.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}>
              <option value="">Leave blank</option>
              {q.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={q.type === "date" && q.includeYear && !q.includeTime ? "date" : q.type === "time" && !q.duration ? "time" : q.type === "number" ? "number" : q.type === "email" ? "email" : "text"}
              value={values[q.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
            />
          )}
        </label>
      ))}
      <div className="copy-field">
        <span className="copy-field-label">Pre-filled link</span>
        <div className="copy-field-row">
          <code>{url}</code>
          <button
            type="button"
            className="secondary-button compact"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                // The link is on screen to select by hand.
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InviteMembers({ formId, members }: { formId: string; members: { id: string; name: string; email: string }[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? members.filter((m) => m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)) : members;
  }, [members, search]);
  const toggle = (id: string) => setChosen((c) => { const next = new Set(c); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return (
    <div className="fb-invite">
      <input type="search" placeholder="Search members by name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search members" />
      <div className="fb-invite-list" role="group" aria-label="Members">
        {shown.slice(0, 300).map((m) => (
          <label key={m.id} className="fb-chip is-row">
            <input type="checkbox" checked={chosen.has(m.id)} onChange={() => toggle(m.id)} />
            <span>{m.name}</span>
            <small>{m.email}</small>
          </label>
        ))}
        {!shown.length && <p className="fb-hint">No members match.</p>}
      </div>
      <div className="fb-row">
        <button type="button" className="fb-link" onClick={() => setChosen(new Set([...chosen, ...shown.slice(0, 300).map((m) => m.id)]))}>
          Select all shown
        </button>
        {chosen.size > 0 && (
          <button type="button" className="fb-link" onClick={() => setChosen(new Set())}>
            Clear
          </button>
        )}
        <span className="fb-spacer" />
        <button
          type="button"
          className="fb-button"
          disabled={!chosen.size || pending}
          onClick={() =>
            start(async () => {
              const result = await sendFormInvitations(formId, [...chosen]);
              setMessage(result.message);
              if (result.status === "success") setChosen(new Set());
              router.refresh();
            })
          }
        >
          {pending ? "Sending…" : `Email ${chosen.size || ""} ${chosen.size === 1 ? "invitation" : "invitations"}`.replace("  ", " ")}
        </button>
      </div>
      {message && (
        <p className="fb-hint" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-JM", { timeZone: "America/Jamaica", dateStyle: "medium" });

export function InvitationRow({ formId, id, name, sentAt, remindedAt, submittedAt, expired }: { formId: string; id: string; name: string; sentAt: string; remindedAt: string | null; submittedAt: string | null; expired: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <li className="fb-invite-row">
      <span className="fb-invite-name">{name}</span>
      <span className={`badge ${submittedAt ? "blue" : expired ? "red" : "gray"}`}>{submittedAt ? `Responded ${when(submittedAt)}` : expired ? "Link expired" : remindedAt ? `Reminded ${when(remindedAt)}` : `Sent ${when(sentAt)}`}</span>
      {!submittedAt && (
        <>
          <button type="button" className="fb-link" disabled={pending} onClick={() => start(async () => { const r = await remindInvitation(formId, id); setMessage(r.message); router.refresh(); })}>
            {expired ? "Send a new link" : "Remind"}
          </button>
          <button
            type="button"
            className="fb-link is-danger"
            disabled={pending}
            onClick={async () => {
              if (!(await confirm({ title: `Cancel ${name}'s invitation?`, message: "Their link stops working.", confirmLabel: "Cancel invitation" }))) return;
              start(async () => { const r = await cancelInvitation(formId, id); setMessage(r.message); router.refresh(); });
            }}
          >
            Cancel
          </button>
        </>
      )}
      {message && <small role="status">{message}</small>}
    </li>
  );
}
