import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseForm } from "./case-form";

export const metadata: Metadata = { title: "Care Case" };

export default async function CareCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS restricts this to the case owner or an explicitly granted user —
  // a non-authorized pastor gets no row back at all, not an error.
  const { data: careCase } = await supabase.from("care_cases").select("*").eq("id", id).maybeSingle();
  if (!careCase) notFound();

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
