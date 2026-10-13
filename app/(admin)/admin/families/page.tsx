import type { Metadata } from "next";
import { AccessDenied } from "@/components/access-denied";
import { FamilyWorkspace } from "@/components/families/family-workspace";
import { getFamilyData } from "@/lib/families/data";
export const metadata: Metadata = { title: "Families & Connections" };
export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ household?: string }>;
}) {
  const [data, params] = await Promise.all([getFamilyData(true), searchParams]);
  if (!data) return <AccessDenied />;
  return <FamilyWorkspace data={data} initialFocus={params.household} />;
}
