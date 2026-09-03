"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

async function permissions() {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  return { organizationId, canManage: permissions.has("attendance.manage"), canSubmit: permissions.has("attendance.manage") || permissions.has("attendance.submit") };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function saveServiceSchedule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { organizationId, canManage } = await permissions();
  if (!organizationId || !canManage) return { status: "error", message: "You don't have permission to do this." };

  const label = String(formData.get("label") || "").trim();
  const dayOfWeek = Number(formData.get("day_of_week"));
  const serviceTime = String(formData.get("service_time") || "");
  if (!label || Number.isNaN(dayOfWeek) || !serviceTime) return { status: "error", message: "Fill in the label, day, and time." };

  const supabase = await createClient();
  const { error } = await supabase.from("service_schedules").insert({
    organization_id: organizationId,
    label,
    day_of_week: dayOfWeek,
    service_time: serviceTime,
  });
  if (error) return { status: "error", message: "Couldn't save this schedule item." };

  revalidatePath("/admin/attendance");
  return { status: "success", message: `${label} added — ${DAY_NAMES[dayOfWeek]}s.` };
}

export async function toggleScheduleActive(id: string, isActive: boolean): Promise<void> {
  const { canManage } = await permissions();
  if (!canManage) return;
  const supabase = await createClient();
  await supabase.from("service_schedules").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/attendance");
}

export async function submitAttendance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { organizationId, canSubmit } = await permissions();
  if (!organizationId || !canSubmit) return { status: "error", message: "You don't have permission to do this." };

  const serviceScheduleId = String(formData.get("service_schedule_id") || "");
  const serviceDate = String(formData.get("service_date") || "");
  const headcount = Number(formData.get("headcount"));
  const notes = String(formData.get("notes") || "").trim();
  if (!serviceScheduleId || !serviceDate || Number.isNaN(headcount) || headcount < 0) {
    return { status: "error", message: "Choose a service, date, and a valid headcount." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("attendance_records").upsert(
    {
      organization_id: organizationId,
      service_schedule_id: serviceScheduleId,
      service_date: serviceDate,
      headcount,
      notes: notes || null,
      submitted_by: user?.id ?? null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "service_schedule_id,service_date" },
  );
  if (error) return { status: "error", message: "Couldn't save that count. Please try again." };

  revalidatePath("/admin/attendance");
  revalidatePath("/member/attendance");
  revalidatePath("/member");
  revalidatePath("/pastor");
  return { status: "success", message: "Attendance recorded — the dashboard will update immediately." };
}
