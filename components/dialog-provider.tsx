"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

/**
 * Replaces window.confirm() / window.prompt() everywhere in the app with a
 * dialog styled like the rest of the church platform, instead of the
 * browser's own unstyled box that looked out of place on every screen it
 * appeared on — deleting a submission, cancelling a meeting, certifying a
 * document.
 *
 * Mounted once, in the root layout, so it's available on every page —
 * public, member, pastor and admin — including the sign-in flow. Any
 * client component anywhere calls useConfirm()/usePrompt() the same way it
 * would have called the native functions; the call site barely changes,
 * only `if (!confirm(...))` becomes `if (!(await confirm(...)))`.
 */

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red) and — since a slip of
   *  the thumb on Enter shouldn't delete something — puts the keyboard
   *  focus on Cancel instead of Confirm when the dialog opens. */
  danger?: boolean;
};

type PromptOptions = {
  title?: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** An empty answer resolves to null (same as pressing Cancel), matching
   *  window.prompt()'s own behaviour. Set false to allow an empty answer. */
  required?: boolean;
};

type PendingConfirm = { kind: "confirm" } & ConfirmOptions & { resolve: (value: boolean) => void };
type PendingPrompt = { kind: "prompt" } & PromptOptions & { resolve: (value: string | null) => void };
type Pending = PendingConfirm | PendingPrompt;

const ConfirmContext = createContext<((options: ConfirmOptions | string) => Promise<boolean>) | null>(null);
const PromptContext = createContext<((options: PromptOptions | string) => Promise<string | null>) | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const messageId = useId();

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => setPending({ kind: "confirm", ...opts, resolve }));
  }, []);

  const promptFn = useCallback((options: PromptOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;
    setPromptValue("");
    return new Promise<string | null>((resolve) => setPending({ kind: "prompt", ...opts, resolve }));
  }, []);

  const settle = useCallback((value: boolean | string | null) => {
    setPending((current) => {
      if (!current) return current;
      if (current.kind === "confirm") current.resolve(Boolean(value));
      else current.resolve(typeof value === "string" ? value : null);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const focusTarget = pending.kind === "prompt" ? inputRef.current : pending.danger ? cancelRef.current : confirmRef.current;
    focusTarget?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") settle(pending!.kind === "confirm" ? false : null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, settle]);

  function submitPrompt() {
    if (pending?.kind !== "prompt") return;
    const value = promptValue.trim();
    if (pending.required !== false && !value) return;
    settle(value);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      <PromptContext.Provider value={promptFn}>
        {children}
        {pending && (
          <div
            className="app-dialog-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) settle(pending.kind === "confirm" ? false : null);
            }}
          >
            <div className="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
              <span className={`app-dialog-icon${pending.kind === "confirm" && pending.danger ? " danger" : ""}`} aria-hidden="true">
                {pending.kind === "confirm" && pending.danger ? "!" : pending.kind === "prompt" ? "✎" : "✦"}
              </span>
              <h2 id={titleId}>
                {pending.title ?? (pending.kind === "confirm" && pending.danger ? "Are you sure?" : pending.kind === "prompt" ? "One more detail" : "Please confirm")}
              </h2>
              <p id={messageId}>{pending.message}</p>
              {pending.kind === "prompt" && (
                <textarea
                  ref={inputRef}
                  className="app-dialog-input"
                  rows={3}
                  value={promptValue}
                  placeholder={pending.placeholder}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitPrompt();
                  }}
                />
              )}
              <div className="app-dialog-actions">
                <button ref={cancelRef} type="button" className="secondary-button" onClick={() => settle(pending.kind === "confirm" ? false : null)}>
                  {pending.cancelLabel ?? "Cancel"}
                </button>
                {pending.kind === "confirm" ? (
                  <button ref={confirmRef} type="button" className={pending.danger ? "primary-button danger" : "primary-button"} onClick={() => settle(true)}>
                    {pending.confirmLabel ?? "Confirm"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={pending.required !== false && !promptValue.trim()}
                    onClick={submitPrompt}
                  >
                    {pending.confirmLabel ?? "Continue"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
}

/** Drop-in replacement for `window.confirm(message)`, returning a Promise
 *  instead of a boolean — call it with `await`. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within DialogProvider");
  return ctx;
}

/** Drop-in replacement for `window.prompt(message)` — resolves to the typed
 *  text, or null if cancelled or (when `required` isn't set to false) left
 *  blank, matching window.prompt()'s own behaviour. */
export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used within DialogProvider");
  return ctx;
}
