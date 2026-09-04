import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCallbackClient } from "./callback-client";

export const metadata: Metadata = { title: "Signing In" };

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card">
          <h1>Signing you in…</h1>
          <p className="lead">One moment.</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
