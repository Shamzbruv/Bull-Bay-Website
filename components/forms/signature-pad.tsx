"use client";

import { useRef, useState } from "react";

/**
 * Sign with a finger, a pen or a mouse. Saves a PNG of the signature when
 * each stroke ends. Pointer events cover touch, pen and mouse alike; the
 * canvas is drawn at the screen's pixel density so the signature isn't
 * blurry on a phone.
 */
export function SignaturePad({ value, onChange, labelledBy, describedBy, disabled }: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [resigning, setResigning] = useState(!value);

  const context = () => {
    const el = canvas.current;
    if (!el) return null;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = el.getBoundingClientRect();
    if (el.width !== Math.round(width * ratio)) {
      el.width = Math.round(width * ratio);
      el.height = Math.round(height * ratio);
    }
    const ctx = el.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#14254a";
    return ctx;
  };
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  if (value && !resigning) {
    return (
      <div className="fr-signature is-saved" aria-labelledby={labelledBy} aria-describedby={describedBy} role="group">
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URL the respondent just drew */}
        <img src={value} alt="Your signature" />
        <button type="button" className="fr-clear" disabled={disabled} onClick={() => { onChange(null); setResigning(true); }}>
          Sign again
        </button>
      </div>
    );
  }

  return (
    <div className="fr-signature" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <canvas
        ref={canvas}
        className="fr-signature-canvas"
        aria-label="Signature pad: draw your signature"
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = point(e);
          const ctx = context();
          if (ctx && last.current) {
            ctx.beginPath();
            ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
            ctx.fillStyle = "#14254a";
            ctx.fill();
          }
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const ctx = context();
          const next = point(e);
          if (ctx) {
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
          }
          last.current = next;
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          last.current = null;
          if (canvas.current) onChange(canvas.current.toDataURL("image/png"));
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <div className="fr-signature-bar">
        <span>Sign above</span>
        <button
          type="button"
          className="fr-clear"
          disabled={disabled}
          onClick={() => {
            const el = canvas.current;
            el?.getContext("2d")?.clearRect(0, 0, el.width, el.height);
            onChange(null);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
