"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;

  return (
    <div>
      <div className="product-thumb" style={{ minHeight: 320, padding: 0, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
        <img src={images[active]} alt={name} style={{ width: "100%", height: "100%", minHeight: 320, objectFit: "cover" }} />
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={active === i}
              style={{
                border: 0,
                padding: 0,
                borderRadius: 8,
                overflow: "hidden",
                width: 56,
                height: 56,
                cursor: "pointer",
                outline: active === i ? "2px solid var(--color-blue-600)" : "1px solid var(--color-border)",
                outlineOffset: 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
