import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Set Password" };

export default async function UpdatePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=session_not_found");
  const profile = await getCurrentProfile();

  return (
    <div className="auth-card">
      <h1>{profile?.must_change_password ? "Set your password" : "Update your password"}</h1>
      <p className="lead">Choose a password you&apos;ll remember — at least 8 characters.</p>
      <UpdatePasswordForm forced={Boolean(profile?.must_change_password)} />
    </div>
  );
}
