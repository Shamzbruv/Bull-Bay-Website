"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/dialog-provider";
import { createForm, deleteForm, duplicateForm } from "./actions";

export function NewFormGallery({ templates }: { templates: { id: string; name: string; description: string; icon: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const create = (templateId: string | null) => {
    setBusy(templateId ?? "blank");
    setProblem(null);
    start(async () => {
      const result = await createForm(templateId);
      if (result.status === "success" && result.id) router.push(`/admin/forms/${result.id}`);
      else {
        setProblem(result.message);
        setBusy(null);
      }
    });
  };
  return (
    <>
      <div className="fl-gallery">
        <button type="button" className="fl-template is-blank" disabled={pending} onClick={() => create(null)}>
          <span className="fl-template-icon">＋</span>
          <span className="fl-template-name">{busy === "blank" ? "Creating…" : "Blank form"}</span>
          <span className="fl-template-desc">Start from nothing.</span>
        </button>
        {templates.map((t) => (
          <button key={t.id} type="button" className="fl-template" disabled={pending} onClick={() => create(t.id)}>
            <span className="fl-template-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="fl-template-name">{busy === t.id ? "Creating…" : t.name}</span>
            <span className="fl-template-desc">{t.description}</span>
          </button>
        ))}
      </div>
      {problem && <p className="fb-problem" role="alert">{problem}</p>}
    </>
  );
}

export function FormCardActions({ formId, publicId, title, responseCount }: { formId: string; publicId: string; title: string; responseCount: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="fl-actions">
      <button
        type="button"
        className="fb-link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/f/${publicId}`);
            setNote("Link copied");
          } catch {
            setNote(`${window.location.origin}/f/${publicId}`);
          }
        }}
      >
        Copy link
      </button>
      <button
        type="button"
        className="fb-link"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await duplicateForm(formId);
            if (result.status === "success" && result.id) router.push(`/admin/forms/${result.id}`);
            else setNote(result.message);
          })
        }
      >
        Make a copy
      </button>
      <button
        type="button"
        className="fb-link is-danger"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: `Delete "${title}"?`,
            message: responseCount ? `Its ${responseCount} ${responseCount === 1 ? "response" : "responses"} and any uploaded files are deleted too. Download the spreadsheet first if you need them.` : "It's removed for good.",
            confirmLabel: "Delete form",
          });
          if (!ok) return;
          start(async () => {
            const result = await deleteForm(formId);
            setNote(result.status === "success" ? null : result.message);
            router.refresh();
          });
        }}
      >
        Delete
      </button>
      {note && <small role="status">{note}</small>}
    </div>
  );
}
