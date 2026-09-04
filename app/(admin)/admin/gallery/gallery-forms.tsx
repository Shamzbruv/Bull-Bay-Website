"use client";

import { useActionState } from "react";
import { deleteGalleryImage, toggleGalleryImagePublished, updateLivestreamUrl, uploadGalleryImage } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

export function UploadForm() {
  const [state, formAction] = useActionState(uploadGalleryImage, initialActionState);
  return (
    <form className="clay-form" action={formAction}>
      <label>
        Photo
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp" required />
      </label>
      <label>
        Caption
        <input type="text" name="caption" placeholder="Vacation Bible School 2026" />
      </label>
      <label>
        Story (optional)
        <textarea name="story" placeholder="A little context on what's happening in the photo…" />
      </label>
      <FormStatus state={state} />
      <SubmitButton pendingLabel="Uploading…">Add to gallery</SubmitButton>
    </form>
  );
}

export function LivestreamForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, formAction] = useActionState(updateLivestreamUrl, initialActionState);
  return (
    <form className="clay-form" action={formAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ flex: 1, minWidth: 240 }}>
        YouTube livestream URL
        <input type="url" name="livestream_url" defaultValue={currentUrl ?? ""} placeholder="https://youtube.com/watch?v=…" />
      </label>
      <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      <FormStatus state={state} />
    </form>
  );
}

export function GalleryImageCard({ id, url, caption, isPublished }: { id: string; url: string; caption: string | null; isPublished: boolean }) {
  return (
    <div className="panel" style={{ padding: 12 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={caption ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 12 }} />
      <p style={{ fontSize: ".85rem", margin: "8px 0 4px" }}>{caption || <em>No caption</em>}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="check-label" style={{ marginBottom: 0 }}>
          <input type="checkbox" defaultChecked={isPublished} onChange={(e) => toggleGalleryImagePublished(id, e.target.checked)} />
          Published
        </label>
        <button type="button" className="link-button" onClick={() => confirm("Remove this photo permanently?") && deleteGalleryImage(id)}>
          delete
        </button>
      </div>
    </div>
  );
}
