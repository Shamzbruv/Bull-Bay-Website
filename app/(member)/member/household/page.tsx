import type { Metadata } from "next";
import { AccessDenied } from "@/components/access-denied";
import { FamilyWorkspace } from "@/components/families/family-workspace";
import { getFamilyData } from "@/lib/families/data";
export const metadata: Metadata = {
  title: "My Household & Family Connections",
};
export default async function HouseholdPage() {
  const data = await getFamilyData();
  if (!data) return <AccessDenied />;
  return <FamilyWorkspace data={data} />;
}
