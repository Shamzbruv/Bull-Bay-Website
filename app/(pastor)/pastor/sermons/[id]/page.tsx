import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SermonForm } from "../sermon-form";

export const metadata: Metadata = { title: "Edit Sermon" };

export default async function EditSermonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();
  const { data: sermon } = await supabase.from("sermons").select("*").throwOnError().eq("id", id).single();
  if (!sermon) notFound();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Edit Sermon</h1>
        </div>
      </div>
      <div className="panel">
        <SermonForm sermon={sermon} returnTo={from === "admin" ? "/admin/media" : undefined} />
      </div>
    </>
  );
}
