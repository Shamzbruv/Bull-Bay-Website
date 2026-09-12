"use client";

import { useRef, useState, useTransition } from "react";
import { uploadAvatar, removeAvatar } from "@/app/(member)/member/actions";
import { initialActionState } from "@/lib/action-state";
import { AvatarCropper } from "./avatar-cropper";

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
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shown = preview ?? avatarUrl;

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setCropSrc(URL.createObjectURL(file));
  }

  function onCropCancel() {
    setCropSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onCropSave(blob: Blob) {
    setCropSrc(null);
    setPreview(URL.createObjectURL(blob));
    const formData = new FormData();
    formData.append("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    startTransition(async () => {
      const result = await uploadAvatar(initialActionState, formData);
      setMessage(result.message);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Choose a profile photo"
            onChange={onFileChosen}
            disabled={isPending}
          />
          {avatarUrl && (
            <button
              type="button"
              className="secondary-button compact"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setMessage(null);
                  const result = await removeAvatar();
                  setMessage(result.message);
                  setPreview(null);
                })
              }
            >
              Remove
            </button>
          )}
        </div>
        <p className="form-note" style={{ margin: "6px 0 0" }}>
          Choose a photo, then drag and zoom to crop it. Works with JPG, PNG, WEBP, or GIF — up to 5 MB.
        </p>
        {isPending && <p className="form-note">Uploading…</p>}
        {message && (
          <p className="form-note" style={{ color: message.toLowerCase().includes("couldn't") || message.toLowerCase().includes("choose") ? "#a8341f" : "var(--color-olive-700)" }}>
            {message}
          </p>
        )}
      </div>
      {cropSrc && <AvatarCropper src={cropSrc} onCancel={onCropCancel} onSave={onCropSave} />}
    </div>
  );
}
