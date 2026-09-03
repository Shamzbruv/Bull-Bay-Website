import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-card">
      <h1>Reset your password</h1>
      <p className="lead">We&apos;ll email you a link to set a new one.</p>
      <ForgotPasswordForm />
    </div>
  );
}
