"use client";

// Small controls the form builder is made of.

export function Toggle({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <label className={`fb-toggle${disabled ? " is-disabled" : ""}`}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="fb-toggle-track" aria-hidden="true" />
      <span className="fb-toggle-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function NumberField({ label, value, onChange, min, max, step, placeholder, width }: {
  label: string;
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  width?: number;
}) {
  return (
    <label className="fb-field fb-inline">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        style={width ? { width } : undefined}
        onChange={(e) => {
          const n = e.target.value === "" ? undefined : Number(e.target.value);
          onChange(n === undefined || Number.isNaN(n) ? undefined : n);
        }}
      />
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, multiline, maxLength, hint }: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <label className="fb-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value ?? ""} placeholder={placeholder} maxLength={maxLength} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value ?? ""} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, inline }: { label: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; inline?: boolean }) {
  return (
    <label className={`fb-field${inline ? " fb-inline" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
