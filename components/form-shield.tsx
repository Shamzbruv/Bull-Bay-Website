"use client";

import { useEffect, useRef } from "react";
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from "@/lib/spam";

/**
 * Drop this inside any public form to add the two checks that stop
 * automated submissions without putting a puzzle in front of a real
 * visitor — no CAPTCHA, nothing to click, nothing to read.
 *
 * The honeypot is a real input that is simply never shown: moved off
 * screen rather than `display:none`, because some form-fillers skip
 * display:none fields but almost none check computed position. It is
 * hidden from screen readers and removed from the tab order, so a person
 * using a keyboard or a screen reader can neither reach it nor fill it.
 *
 * The timestamp is written after mount, via the DOM rather than state —
 * setting state in an effect is both a wasted render and a lint error in
 * this codebase. Rendering it empty and filling it in on the client is
 * also what makes it meaningful: a value baked in during server rendering
 * would be the page's build time, not the moment this visitor arrived.
 */
export function FormShield() {
  const stamp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stamp.current) stamp.current.value = String(Date.now());
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Website
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <input ref={stamp} type="hidden" name={TIMESTAMP_FIELD} defaultValue="" />
    </div>
  );
}
