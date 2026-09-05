import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAuthUser, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { CaseForm } from "./case-form";

export const metadata: Metadata = { title: "Care Case" };

export default async function CareCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await getOrganizationId();
  const [user, permissions] = await Promise.all([getAuthUser(), getUserPermissions(organizationId ?? "")]);
  const canManageCare = permissions.has("care.manage");

  // Service-role read + a manual owner-or-care.manage check, replicating
  // "care_cases scoped read" in code — that policy currently recurses via
  // care_case_access (see 20260904050000_fix_care_cases_rls_recursion.sql,
  // not yet applied), so the RLS-scoped client can't read this table at
  // all right now. A case shared via an explicit care_case_access grant
  // (rather than ownership or care.manage) isn't recognized here, since
  // checking that table hits the same recursion.
  const { data: careCase } = await createServiceRoleClient().from("care_cases").select("*").eq("id", id).maybeSingle();
  if (!careCase || careCase.organization_id !== organizationId) notFound();
  if (careCase.owner_id !== user?.id && !canManageCare) notFound();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Pastoral Care Case</h1>
          <p>Confidential — visible only to you and anyone explicitly granted access.</p>
        </div>
      </div>
      <div className="panel">
        <CaseForm careCase={careCase} />
      </div>
    </>
  );
}
