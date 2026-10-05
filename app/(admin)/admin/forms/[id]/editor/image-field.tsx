"use client";

import { useRef, useState } from "react";
import { uploadFormImage } from "../../actions";

/** Upload a picture (kept on the church's own storage) or paste an address. */
export function ImageField({ formId, value, onChange }: { formId: string; value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="fb-image-picker">
      {value && /^https:\/\//.test(value) && (
        // eslint-disable-next-line @next/next/no-img-element -- an image on the church's own storage, shown at its natural size
        <img src={value} alt="" />
      )}
      <div className="fb-row">
        <label className={`fb-button is-secondary${busy ? " is-busy" : ""}`}>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setProblem(null);
              const data = new FormData();
              data.append("file", file);
              const result = await uploadFormImage(formId, data);
              setBusy(false);
              if (input.current) input.current.value = "";
              if (result.status === "success" && result.url) onChange(result.url);
              else setProblem(result.message);
            }}
          />
          {busy ? "Uploading…" : value ? "Replace image" : "Upload an image"}
        </label>
        <input className="fb-url" aria-label="Or paste an image address" placeholder="or paste an image address (https://…)" value={value} onChange={(e) => onChange(e.target.value.trim())} />
      </div>
      {problem && <p className="fb-problem">{problem}</p>}
    </div>
  );
}
