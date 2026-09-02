import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <Link href="/" className="link-button" style={{ marginBottom: 20, display: "inline-flex" }}>
        ← Back to Bull Bay
      </Link>
      {children}
    </div>
  );
}
