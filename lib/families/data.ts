import {
  getCurrentProfile,
  getUserPermissions,
  getUserRoleCodes,
} from "@/lib/auth/session";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  memberFamilyData,
  type FamilyData,
  type RelationshipKind,
} from "./model";

async function allRows<T>(
  fetchPage: (
    offset: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const result: T[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const { data, error } = await fetchPage(offset);
    if (error)
      throw new Error("Family records could not be loaded. Please try again.");
    result.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return result;
  }
  throw new Error(
    "This family directory is too large to load. Contact the church office.",
  );
}
export async function getFamilyData(staff = false): Promise<FamilyData | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.membership_status === "deceased") return null;
  const permissions = await getUserPermissions(profile.organization_id);
  if (staff && !permissions.has("people.read")) return null;
  const preview = (await cookies()).get("workspace_preview")?.value;
  const readOnly = Boolean(
    preview &&
      preview !== "super_admin" &&
      (await getUserRoleCodes(profile.organization_id)).has("super_admin"),
  );
  const db = createServiceRoleClient();
  const org = profile.organization_id;
  // Only names, household IDs, and the explicit family graph are read here.
  // No contact addresses, birth dates, office notes, or member details are sent.
  const [profiles, households, relationships, invitations] = await Promise.all([
    allRows((offset) =>
      db
        .from("profiles")
        .select("id,first_name,last_name,household_id,updated_at")
        .eq("organization_id", org)
        .order("id")
        .range(offset, offset + 999),
    ),
    allRows((offset) =>
      db
        .from("households")
        .select("id,name,description,updated_at")
        .eq("organization_id", org)
        .order("id")
        .range(offset, offset + 999),
    ),
    allRows((offset) =>
      db
        .from("family_relationships")
        .select("*")
        .eq("organization_id", org)
        .in("status", ["pending", "confirmed"])
        .order("id")
        .range(offset, offset + 999),
    ),
    allRows((offset) =>
      db
        .from("household_invitations")
        .select("*")
        .eq("organization_id", org)
        .eq("status", "pending")
        .order("id")
        .range(offset, offset + 999),
    ),
  ]);
  const data: FamilyData = {
    viewerId: profile.id,
    viewerUserId: profile.auth_user_id!,
    householdId:
      profiles.find((p) => p.id === profile.id)?.household_id ?? null,
    staff,
    readOnly,
    canManage: !readOnly && staff && permissions.has("people.write"),
    people: profiles.map((p) => ({
      id: p.id,
      name:
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        "Unnamed person",
      householdId: p.household_id,
      updatedAt: p.updated_at,
    })),
    households: households.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      updatedAt: h.updated_at,
    })),
    links: relationships.map((r) => ({
      id: r.id,
      sourceId: r.source_profile_id,
      targetId: r.target_profile_id,
      recipientId: r.recipient_profile_id,
      kind: r.kind as RelationshipKind,
      notes: r.notes,
      status: r.status,
      requestedBy: r.requested_by ?? "",
      updatedAt: r.updated_at,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      householdId: i.household_id,
      sourceId: i.source_profile_id,
      targetId: i.target_profile_id,
      status: i.status,
      updatedAt: i.updated_at,
    })),
  };
  return staff ? data : memberFamilyData(data);
}
