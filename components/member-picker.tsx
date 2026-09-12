"use client";

import { useMemo, useState } from "react";

export type MemberOption = { id: string; name: string; email?: string | null };

/**
 * Type-to-filter combobox for picking a person by name, submitting
 * through a normal hidden form field — used anywhere staff need to find
 * someone in the church without knowing their exact email or scrolling a
 * long plain <select> (ministry leader, ministry assignment roster,
 * inviting/assigning a staff role).
 */
export function MemberPicker({
  members,
  fieldName,
  defaultMemberId,
  placeholder = "Type a name to search…",
  noneOption,
  onSelect,
}: {
  members: MemberOption[];
  fieldName: string;
  defaultMemberId?: string | null;
  placeholder?: string;
  /** Label for an explicit "no one" choice (e.g. "No leader assigned"). Omit to require a pick. */
  noneOption?: string;
  /** Fires with the full option (or null, for "none") whenever a selection is made. */
  onSelect?: (member: MemberOption | null) => void;
}) {
  const initial = members.find((m) => m.id === defaultMemberId) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  }, [query, members]);

  function choose(option: MemberOption | null) {
    setSelectedId(option?.id ?? null);
    setQuery(option?.name ?? "");
    setOpen(false);
    onSelect?.(option);
  }

  return (
    <div style={{ position: "relative" }}>
      <input type="hidden" name={fieldName} value={selectedId ?? ""} />
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${fieldName}-listbox`}
      />
      {open && (
        <div
          id={`${fieldName}-listbox`}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 5,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 240,
            overflowY: "auto",
            borderRadius: 10,
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          {noneOption && (
            <button type="button" role="option" aria-selected={selectedId === null} className="leader-picker-option" onMouseDown={() => choose(null)}>
              {noneOption}
            </button>
          )}
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={selectedId === m.id}
              className="leader-picker-option"
              onMouseDown={() => choose(m)}
            >
              {m.name}
              {m.email && <span style={{ color: "var(--color-muted)", fontSize: ".78rem" }}> — {m.email}</span>}
            </button>
          ))}
          {filtered.length === 0 && <p style={{ margin: 0, padding: "10px 14px", fontSize: ".82rem", color: "var(--color-muted)" }}>No one matches that name.</p>}
        </div>
      )}
    </div>
  );
}
