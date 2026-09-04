import Link from "next/link";
import Image from "next/image";

// See components/simple-dashboard-nav.tsx for why this exists separately
// from components/dashboard-topbar.tsx.
export function SimpleDashboardTopbar({ label }: { label: string }) {
  return (
    <div className="site-header" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <Link className="brand" href="/">
        <Image src="/images/brand/bull-bay-symbol.png" alt="" width={44} height={44} className="brand-logo" />
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
