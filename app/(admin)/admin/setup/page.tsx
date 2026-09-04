import type { Metadata } from "next";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { getCurrentProfile, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";
import styles from "./setup.module.css";

export const metadata: Metadata = { title: "Setup Center" };

type SetupStep = {
  title: string;
  description: string;
  href: string;
  ready: boolean;
  readyLabel: string;
  actionLabel: string;
};

export default async function SetupCenterPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("roles.manage") && !permissions.has("sites.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const [
    profilesResult,
    teamResult,
    schedulesResult,
    templatesResult,
    campusResult,
    galleryResult,
    announcementsResult,
    fundsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").not("auth_user_id", "is", null),
    supabase.from("pastoral_team_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("is_pastor", true).eq("is_active", true),
    supabase.from("service_schedules").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("is_active", true),
    supabase.from("document_templates").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("is_active", true),
    supabase.from("campuses").select("livestream_url").eq("organization_id", organizationId ?? "").eq("is_primary", true).maybeSingle(),
    supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("is_published", true),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "published"),
    supabase.from("funds").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("is_active", true),
  ]);

  const steps: SetupStep[] = [
    {
      title: "Complete your administrator profile",
      description: "Add your name, church record, contact details and professional information.",
      href: "/member/profile?onboarding=1",
      ready: Boolean(profile?.first_name && profile?.last_name && profile?.phone),
      readyLabel: "Profile ready",
      actionLabel: "Complete profile",
    },
    {
      title: "Invite your church team",
      description: "Only invited email addresses can create access. Assign the right workspace role as you invite.",
      href: "/admin/people",
      ready: (profilesResult.count ?? 0) > 1,
      readyLabel: `${profilesResult.count ?? 0} accounts`,
      actionLabel: "Invite people",
    },
    {
      title: "Name the senior pastor and care team",
      description: "Add the pastor, elders, deacons and deaconesses; mark who is trained for counselling.",
      href: "/admin/pastoral-team",
      ready: (teamResult.count ?? 0) > 0,
      readyLabel: "Pastor selected",
      actionLabel: "Add pastoral team",
    },
    {
      title: "Confirm weekly service times",
      description: "These schedules drive weekly attendance tasks and the member dashboard.",
      href: "/admin/attendance",
      ready: (schedulesResult.count ?? 0) > 0,
      readyLabel: `${schedulesResult.count ?? 0} active`,
      actionLabel: "Review schedule",
    },
    {
      title: "Customize office document templates",
      description: "Starter membership, character-reference, certification and general-letter templates are ready to edit.",
      href: "/admin/documents",
      ready: (templatesResult.count ?? 0) > 0,
      readyLabel: `${templatesResult.count ?? 0} templates`,
      actionLabel: "Create templates",
    },
    {
      title: "Connect church email",
      description: "Configure Resend, a branded sender and the reply-to address used by the church office.",
      href: "/admin/communications",
      ready: isEmailConfigured(),
      readyLabel: "Email connected",
      actionLabel: "Configure email",
    },
    {
      title: "Prepare livestream and gallery",
      description: "Add the live service link and publish the first church story or gallery photograph.",
      href: "/admin/gallery",
      ready: Boolean(campusResult.data?.livestream_url) && (galleryResult.count ?? 0) > 0,
      readyLabel: "Media ready",
      actionLabel: "Set up media",
    },
    {
      title: "Publish the first bulletin",
      description: "Give members a useful announcement as soon as they enter their dashboard.",
      href: "/admin/bulletin",
      ready: (announcementsResult.count ?? 0) > 0,
      readyLabel: `${announcementsResult.count ?? 0} published`,
      actionLabel: "Write bulletin",
    },
    {
      title: "Review giving funds",
      description: "Confirm the funds finance staff will use for tithes, offerings, missions and special gifts.",
      href: "/admin/giving",
      ready: (fundsResult.count ?? 0) > 0,
      readyLabel: `${fundsResult.count ?? 0} funds`,
      actionLabel: "Review finance",
    },
  ];

  const queryError = [profilesResult, teamResult, schedulesResult, templatesResult, campusResult, galleryResult, announcementsResult, fundsResult].some(
    (result) => Boolean(result.error),
  );
  const readyCount = steps.filter((step) => step.ready).length;
  const percentage = Math.round((readyCount / steps.length) * 100);

  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className="eyebrow light"><span /> Church workspace</p>
          <h1>Let&apos;s make the platform feel lived in.</h1>
          <p>Complete these once, then each team will land in a useful workspace with real actions instead of blank screens.</p>
        </div>
        <div className={styles.progress} aria-label={`${percentage}% of setup complete`}>
          <div><strong>{percentage}%</strong><span>ready</span></div>
        </div>
      </section>

      {queryError && (
        <div className={styles.notice} role="status">
          Some setup checks could not be loaded. The links still work; refresh after confirming the latest database migration is applied.
        </div>
      )}

      <div className={styles.grid}>
        {steps.map((step, index) => (
          <Link className={styles.step} href={step.href} key={step.title} data-ready={step.ready}>
            <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.copy}>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </span>
            <span className={styles.status}>{step.ready ? step.readyLabel : step.actionLabel}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
