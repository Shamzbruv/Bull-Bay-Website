import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="lead">Sign in to access your profile, giving history, groups and more.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
