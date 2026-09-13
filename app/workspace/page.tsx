import { redirect } from "next/navigation";
import { getAuthUser, getOrganizationId } from "@/lib/auth/session";
import { getWorkspaceAccess } from "@/lib/auth/workspace";
export default async function WorkspacePage() {
  if (!(await getAuthUser())) redirect("/login");
  const org = await getOrganizationId();
  if (!org) redirect("/");
  redirect(`/${(await getWorkspaceAccess(org)).home}`);
}
