"use client";

import { useRef, useState } from "react";

const VIEWPORT = 280;
const OUTPUT_SIZE = 512;

/**
 * A from-scratch pan + zoom crop tool (canvas output, no dependency) —
 * drag to reposition, slide to zoom, save renders exactly what's inside
 * the circle to a fixed-size JPEG. Also why every upload ends up as a
 * plain JPEG regardless of what was picked: as long as the browser can
 * decode the source into an <img> (true for JPEG/PNG/WEBP/GIF, and HEIC
 * on Safari/iOS — not on Chrome/Android, which is the one real gap),
 * canvas re-encodes it, so the server never has to deal with the
 * original file's format at all.
 */
export function AvatarCropper({
  src,
  onCancel,
  onSave,
}: {
  src: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const baseScale = naturalSize ? VIEWPORT / Math.min(naturalSize.w, naturalSize.h) : 1;
  const scale = baseScale * zoom;
  const dispW = naturalSize ? naturalSize.w * scale : 0;
  const dispH = naturalSize ? naturalSize.h * scale : 0;
  const maxOffsetX = Math.max(0, (dispW - VIEWPORT) / 2);
  const maxOffsetY = Math.max(0, (dispH - VIEWPORT) / 2);

  function clamp(value: { x: number; y: number }) {
    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, value.x)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, value.y)),
    };
  }

  // Clamped at read time rather than re-synced via an effect: maxOffsetX/Y
  // already recompute from zoom/naturalSize on every render, so deriving
  // the displayed position here keeps a zoom-out from parking the image
  // outside the visible window without an extra render pass.
  const displayOffset = clamp(offset);

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: displayOffset.x, originY: displayOffset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clamp({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy }));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function save() {
    const img = imgRef.current;
    if (!img || !naturalSize) return;
    setSaving(true);
    const left = VIEWPORT / 2 - dispW / 2 + displayOffset.x;
    const top = VIEWPORT / 2 - dispH / 2 + displayOffset.y;
    const srcX = -left / scale;
    const srcY = -top / scale;
    const srcSize = VIEWPORT / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSaving(false);
      return;
    }
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onSave(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        background: "rgba(6, 20, 38, .72)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 20,
          padding: 24,
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 30px 80px rgba(6,20,38,.35)",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>Position your photo</h2>
        <p className="form-note" style={{ marginTop: 0 }}>Drag to reposition, and use the slider to zoom.</p>

        {loadFailed ? (
          <div className="alert warn" style={{ textAlign: "left" }}>
            This photo&apos;s format couldn&apos;t be opened for cropping — this usually happens with HEIC photos on
            some phones/browsers. Please choose a JPG, PNG, or WEBP photo instead (or re-save this one in one of
            those formats first).
          </div>
        ) : (
          <>
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                width: VIEWPORT,
                height: VIEWPORT,
                margin: "16px auto",
                borderRadius: "50%",
                overflow: "hidden",
                position: "relative",
                background: "#000",
                cursor: "grab",
                touchAction: "none",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,.6)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL of a locally-chosen file, not optimizable */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setLoadFailed(true)}
                style={{
                  position: "absolute",
                  left: VIEWPORT / 2 - dispW / 2 + displayOffset.x,
                  top: VIEWPORT / 2 - dispH / 2 + displayOffset.y,
                  width: dispW || undefined,
                  height: dispH || undefined,
                  maxWidth: "none",
                  userSelect: "none",
                }}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={!naturalSize}
              style={{ width: "100%" }}
              aria-label="Zoom"
            />
          </>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
          <button type="button" className="secondary-button compact" onClick={onCancel}>
            Cancel
          </button>
          {!loadFailed && (
            <button type="button" className="primary-button compact" onClick={save} disabled={!naturalSize || saving}>
              {saving ? "Saving…" : "Save photo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
