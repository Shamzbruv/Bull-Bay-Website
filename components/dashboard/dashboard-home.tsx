import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./dashboard-home.module.css";

type DashboardAction = {
  href: string;
  label: string;
};

type Tone = "blue" | "gold" | "green" | "rose" | "plum" | "neutral";

export function DashboardHome({ children }: { children: ReactNode }) {
  return <div className={styles.home}>{children}</div>;
}

export function DashboardHero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  aside,
  variant = "member",
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: DashboardAction;
  secondaryAction?: DashboardAction;
  aside?: ReactNode;
  variant?: "member" | "admin" | "pastor";
}) {
  return (
    <section className={`${styles.hero} ${styles[`hero_${variant}`]}`}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroContent}>
        <span className={styles.heroEyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {(primaryAction || secondaryAction) && (
          <div className={styles.heroActions}>
            {primaryAction && (
              <Link className={styles.primaryButton} href={primaryAction.href}>
                {primaryAction.label}
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {secondaryAction && (
              <Link className={styles.secondaryButton} href={secondaryAction.href}>
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </div>
      {aside && <div className={styles.heroAside}>{aside}</div>}
    </section>
  );
}

export function HeroSnapshot({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const content = (
    <>
      <span className={styles.snapshotLabel}>{label}</span>
      <strong>{value}</strong>
      {detail && <span className={styles.snapshotDetail}>{detail}</span>}
      {href && <span className={styles.snapshotLink}>Open details →</span>}
    </>
  );

  return href ? (
    <Link className={styles.snapshot} href={href}>
      {content}
    </Link>
  ) : (
    <div className={styles.snapshot}>{content}</div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className={styles.metricGrid}>{children}</div>;
}

export function MetricLink({
  href,
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  href: string;
  label: string;
  value: ReactNode;
  detail: string;
  icon: string;
  tone?: Tone;
}) {
  return (
    <Link className={`${styles.metric} ${styles[`tone_${tone}`]}`} href={href}>
      <span className={styles.metricTopline}>
        <span className={styles.metricIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.metricArrow} aria-hidden="true">
          ↗
        </span>
      </span>
      <strong className={styles.metricValue}>{value}</strong>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricDetail}>{detail}</span>
    </Link>
  );
}

export function DashboardColumns({ children, balanced = false }: { children: ReactNode; balanced?: boolean }) {
  return <div className={balanced ? styles.columnsBalanced : styles.columns}>{children}</div>;
}

export function DashboardPanel({
  eyebrow,
  title,
  description,
  action,
  children,
  tone = "plain",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: DashboardAction;
  children: ReactNode;
  tone?: "plain" | "warm" | "softBlue";
}) {
  return (
    <section className={`${styles.panel} ${styles[`panel_${tone}`]}`}>
      <div className={styles.panelHeader}>
        <div>
          {eyebrow && <span className={styles.panelEyebrow}>{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action && (
          <Link className={styles.panelAction} href={action.href}>
            {action.label} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function QuickActionGrid({ children }: { children: ReactNode }) {
  return <div className={styles.quickGrid}>{children}</div>;
}

export function QuickActionLink({
  href,
  icon,
  title,
  description,
  tone = "neutral",
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  tone?: Tone;
}) {
  return (
    <Link className={`${styles.quickAction} ${styles[`tone_${tone}`]}`} href={href}>
      <span className={styles.quickIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.quickCopy}>
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className={styles.quickArrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
}

export function ActivityList({ children }: { children: ReactNode }) {
  return <div className={styles.activityList}>{children}</div>;
}

export function ActivityItem({
  href,
  eyebrow,
  title,
  body,
  meta,
  badge,
  badgeTone = "neutral",
}: {
  href?: string;
  eyebrow?: string;
  title: string;
  body?: string;
  meta?: string;
  badge?: string;
  badgeTone?: Tone;
}) {
  const content = (
    <>
      <span className={styles.activityCopy}>
        {eyebrow && <span className={styles.activityEyebrow}>{eyebrow}</span>}
        <strong>{title}</strong>
        {body && <span className={styles.activityBody}>{body}</span>}
        {meta && <span className={styles.activityMeta}>{meta}</span>}
      </span>
      <span className={styles.activityTail}>
        {badge && <StatusPill tone={badgeTone}>{badge}</StatusPill>}
        {href && <span className={styles.activityArrow}>→</span>}
      </span>
    </>
  );

  return href ? (
    <Link className={styles.activityItem} href={href}>
      {content}
    </Link>
  ) : (
    <div className={styles.activityItem}>{content}</div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`${styles.pill} ${styles[`pill_${tone}`]}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: DashboardAction;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyMark} aria-hidden="true">
        ✦
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action && (
        <Link href={action.href}>
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

export function QueryErrorNotice({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <aside className={styles.errorNotice} role="alert">
      <span className={styles.errorIcon} aria-hidden="true">
        !
      </span>
      <div>
        <strong>Some live information could not be loaded.</strong>
        <p>The page is still usable. Try refreshing; if this continues, check the database permissions.</p>
        <details>
          <summary>Technical details</summary>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </details>
      </div>
    </aside>
  );
}

export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressCopy}>
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className={styles.progressTrack} aria-label={`${label}: ${safeValue}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function SetupList({ children }: { children: ReactNode }) {
  return <div className={styles.setupList}>{children}</div>;
}

export function SetupItem({
  href,
  title,
  description,
  complete,
}: {
  href: string;
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <Link className={styles.setupItem} href={href}>
      <span className={complete ? styles.setupComplete : styles.setupPending} aria-hidden="true">
        {complete ? "✓" : ""}
      </span>
      <span>
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <StatusPill tone={complete ? "green" : "gold"}>{complete ? "Ready" : "Set up"}</StatusPill>
    </Link>
  );
}

export function ChartFrame({ children }: { children: ReactNode }) {
  return <div className={styles.chartFrame}>{children}</div>;
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className={styles.mutedNote}>{children}</p>;
}
