"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./dashboard-route-state.module.css";

export function DashboardRouteLoading() {
  return (
    <div className={styles.state} role="status" aria-label="Loading workspace">
      <div className={styles.skeleton}>
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.tiles}>
          <div className={styles.tile} />
          <div className={styles.tile} />
          <div className={styles.tile} />
        </div>
      </div>
    </div>
  );
}

/**
 * `error` is optional only so every existing call site keeps compiling —
 * always pass it when you have it. Next.js redacts a thrown error's real
 * message in production and gives back a `digest` instead, a short id
 * that correlates to the full server-side log entry. Showing it here is
 * the difference between "nothing works" and something we can actually
 * search Railway's logs for.
 */
export function DashboardRouteError({ error, reset }: { error?: (Error & { digest?: string }) | null; reset: () => void }) {
  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  return (
    <div className={styles.state}>
      <div className={styles.card} role="alert">
        <span className={styles.mark}>!</span>
        <h2>This page didn&apos;t finish loading.</h2>
        <p>Your information is safe. Try the page again; if it continues, the latest database update may still need to be applied.</p>
        <div className="button-row" style={{ justifyContent: "center" }}>
          <button type="button" className="primary-button" onClick={reset}>Try again</button>
          <Link className="secondary-button" href="/member">Back to dashboard</Link>
        </div>
        {(error?.digest || error?.message) && (
          <p style={{ marginTop: 18, fontSize: ".68rem", color: "var(--color-muted)", wordBreak: "break-all" }}>
            Reference: {error?.digest ?? error?.message}
          </p>
        )}
      </div>
    </div>
  );
}
