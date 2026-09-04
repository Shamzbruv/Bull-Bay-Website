/**
 * Raw REST call to Supabase's admin/generate_link endpoint, bypassing
 * supabase-js's admin.auth.admin.generateLink(). Verified by hand (curl)
 * against this project: the installed @supabase/auth-js sends `redirectTo`
 * (camelCase) at the top level of the request body, but GoTrue's REST API
 * only honors snake_case `redirect_to` — the camelCase field is silently
 * ignored and the link falls back to the bare site_url with no path, no
 * matter what's in the redirect allow-list. That's what was actually
 * sending people to a dead end after clicking invite/reset links even
 * after the SITE_URL and uri_allow_list fixes landed. This calls the same
 * endpoint with the field name GoTrue actually reads.
 */
export async function generateAuthLink(opts: {
  type: "invite" | "recovery" | "magiclink" | "signup";
  email: string;
  redirectTo: string;
}): Promise<{ actionLink: string | null; userId: string | null; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { actionLink: null, userId: null, error: "Server is missing Supabase configuration." };
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: opts.type, email: opts.email, redirect_to: opts.redirectTo }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { actionLink: null, userId: null, error: data?.msg ?? data?.message ?? `Request failed (${res.status})` };
  }

  return { actionLink: data?.action_link ?? null, userId: data?.id ?? null, error: null };
}
