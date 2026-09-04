"use client";

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

export function DashboardRouteError({ reset }: { reset: () => void }) {
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
      </div>
    </div>
  );
}
