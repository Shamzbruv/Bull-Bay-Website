"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { uploadAvatar, removeAvatar } from "@/app/(member)/member/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BB"
  );
}

export function AvatarUploader({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [state, formAction] = useActionState(uploadAvatar, initialActionState);
  const [preview, setPreview] = useState<string | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shown = preview ?? avatarUrl;

  return (
    <div className="avatar-uploader" style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          overflow: "hidden",
          flex: "0 0 72px",
          display: "grid",
          placeItems: "center",
          background: "var(--color-olive-600)",
          color: "#fff",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.3rem",
        }}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL / local blob preview, not optimizable
          <img src={shown} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials(name)
        )}
      </div>
      <div>
        <form
          action={formAction}
          onSubmit={() => {
            const file = fileInputRef.current?.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            required
            aria-label="Choose a profile photo"
          />
          <SubmitButton pendingLabel="Uploading…">Upload photo</SubmitButton>
          {avatarUrl && (
            <button
              type="button"
              className="secondary-button compact"
              disabled={isRemoving}
              onClick={() =>
                startRemove(async () => {
                  await removeAvatar();
                })
              }
            >
              Remove
            </button>
          )}
        </form>
        <p className="form-note" style={{ margin: "6px 0 0" }}>JPG, PNG, or WEBP, up to 5 MB.</p>
        <FormStatus state={state} />
      </div>
    </div>
  );
}
