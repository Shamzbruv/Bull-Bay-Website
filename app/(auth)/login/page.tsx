import type { Metadata } from "next";
import { safeNextPath } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign In" };

/**
 * The search params are read here, on the server, and handed to the form as
 * plain props. Reading them inside the client component instead (with
 * useSearchParams) opts the whole form out of server rendering, and the
 * page went out with no form in its HTML at all — just a heading, until
 * the JavaScript arrived. On a phone on mobile data that is a blank screen
 * where the sign-in box should be, and if the bundle fails to load it is a
 * church nobody can sign in to. Keep this a Server Component.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="auth-card">
      <h1>Welcome back</h1>
      <p className="lead">Sign in to access your profile, giving history, groups and more.</p>
      <LoginForm next={safeNextPath(params.next)} callbackError={params.error ?? null} />
    </div>
  );
}
