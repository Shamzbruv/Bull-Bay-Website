import Link from "next/link";

export function DashboardTopbar({ label }: { label: string }) {
  return (
    <div className="site-header" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <i />
        </span>
        <span>
          <strong>NTCOG</strong>
          <small>BULL BAY</small>
        </span>
      </Link>
      <span style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--color-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <Link href="/" className="link-button">
        ← Back to site
      </Link>
    </div>
  );
}
