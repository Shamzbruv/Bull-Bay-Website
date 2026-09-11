"use client";

import { useMemo, useState } from "react";

type LeaderOption = { id: string; name: string };

/** A plain <select> gets unwieldy once the member list is more than a
 * handful of names — this is a type-to-filter combobox instead, while
 * still submitting through a normal hidden form field. */
export function LeaderPicker({ leaders, defaultLeaderId }: { leaders: LeaderOption[]; defaultLeaderId: string | null }) {
  const initial = leaders.find((l) => l.id === defaultLeaderId) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initial?.id ?? null);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leaders;
    return leaders.filter((l) => l.name.toLowerCase().includes(q));
  }, [query, leaders]);

  function choose(option: LeaderOption | null) {
    setSelectedId(option?.id ?? null);
    setQuery(option?.name ?? "");
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <input type="hidden" name="leader_profile_id" value={selectedId ?? ""} />
      <input
        type="text"
        placeholder="Type a name to search…"
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
        aria-controls="leader-picker-listbox"
      />
      {open && (
        <div
          id="leader-picker-listbox"
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
          <button
            type="button"
            role="option"
            aria-selected={selectedId === null}
            className="leader-picker-option"
            onMouseDown={() => choose(null)}
          >
            No leader assigned
          </button>
          {filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              aria-selected={selectedId === l.id}
              className="leader-picker-option"
              onMouseDown={() => choose(l)}
            >
              {l.name}
            </button>
          ))}
          {filtered.length === 0 && <p style={{ margin: 0, padding: "10px 14px", fontSize: ".82rem", color: "var(--color-muted)" }}>No one matches that name.</p>}
        </div>
      )}
    </div>
  );
}
