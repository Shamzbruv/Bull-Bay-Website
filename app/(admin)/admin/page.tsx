import type { Metadata } from "next";
import { addQueryError, loadDashboardContext } from "@/components/dashboard/dashboard-data";
import {
  ActivityItem,
  ActivityList,
  DashboardColumns,
  DashboardHero,
  DashboardHome,
  DashboardPanel,
  EmptyState,
  HeroSnapshot,
  MetricGrid,
  MetricLink,
  ProgressMeter,
  QueryErrorNotice,
  QuickActionGrid,
  QuickActionLink,
  SetupItem,
  SetupList,
} from "@/components/dashboard/dashboard-home";

export const metadata: Metadata = { title: "Admin Dashboard" };

type Tone = "blue" | "gold" | "green" | "rose" | "plum" | "neutral";

type WorkItem = {
  href: string;
  title: string;
  description: string;
  count: number | null;
  unavailable: boolean;
  tone: Tone;
};

type QuickAction = {
  href: string;
  icon: string;
  title: string;
  description: string;
  tone: Tone;
};

type SetupCheck = {
  href: string;
  title: string;
  description: string;
  complete: boolean;
  unavailable: boolean;
};

function countValue(result: { count: number | null; error: { message: string } | null }) {
  return result.error ? "—" : (result.count ?? 0);
}

export default async function AdminDashboardPage() {
  const context = await loadDashboardContext(true);
  const { supabase, profile, permissions, roleCodes, roleNames } = context;
  const errors = [...context.errors];
  const organizationId = profile?.organization_id ?? "";
  const now = new Date();
  const nowIso = now.toISOString();

  const canPeopleWrite = permissions.has("people.write");
  const canEvents = permissions.has("events.manage");
  const canGroups = permissions.has("groups.manage");
  const canVolunteers = permissions.has("volunteers.manage");
  const canShop = permissions.has("shop.manage");
  const canGiving = permissions.has("giving.read") || permissions.has("giving.manage");
  const canManageGiving = permissions.has("giving.manage");
  const canDocuments = permissions.has("documents.manage");
  const canContent = permissions.has("content.manage");
  const canMedia = permissions.has("media.manage");
  const canSermons = permissions.has("sermons.manage");
  const canAttendance = permissions.has("attendance.manage") || permissions.has("attendance.submit");
  const canRoles = permissions.has("roles.manage");
  const canSettings = permissions.has("sites.manage");
  const canCommunicate = permissions.has("communications.send");

  const noCount = () => Promise.resolve({ count: null, error: null });
  const noRecord = () => Promise.resolve({ data: null, error: null });

  const [
    visitorResult,
    eventResult,
    groupResult,
    orderResult,
    donationResult,
    documentResult,
    bulletinDraftResult,
    galleryResult,
    sermonResult,
    serviceResult,
    fundResult,
    productResult,
    templateResult,
    publishedBulletinResult,
    roleAssignmentResult,
    campusResult,
  ] = await Promise.all([
    canPeopleWrite
      ? supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "new")
      : noCount(),
    canEvents
      ? supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "published").gte("starts_at", nowIso)
      : noCount(),
    canGroups
      ? supabase.from("group_members").select("id, groups!inner(organization_id)", { count: "exact", head: true }).eq("groups.organization_id", organizationId).eq("status", "requested")
      : noCount(),
    canShop
      ? supabase.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["paid", "processing"])
      : noCount(),
    canGiving
      ? supabase.from("donations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "pending")
      : noCount(),
    canDocuments
      ? supabase.from("document_requests").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["submitted", "in_review", "prepared"])
      : noCount(),
    canContent
      ? supabase.from("announcements").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "draft")
      : noCount(),
    canMedia
      ? supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_published", false)
      : noCount(),
    canSermons
      ? supabase.from("sermons").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "draft")
      : noCount(),
    canAttendance
      ? supabase.from("service_schedules").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_active", true)
      : noCount(),
    canGiving
      ? supabase.from("funds").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_active", true)
      : noCount(),
    canShop
      ? supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).neq("status", "archived")
      : noCount(),
    canDocuments
      ? supabase.from("document_templates").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_active", true)
      : noCount(),
    canContent
      ? supabase.from("announcements").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "published")
      : noCount(),
    canRoles
      ? supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId)
      : noCount(),
    canSettings || canMedia
      ? supabase
          .from("campuses")
          .select("id, phone, email, address_line1, livestream_url")
          .eq("organization_id", organizationId)
          .eq("is_primary", true)
          .maybeSingle()
      : noRecord(),
  ]);

  const queryErrors: [boolean, string, { message: string } | null][] = [
    [canPeopleWrite, "Visitor enquiries", visitorResult.error],
    [canEvents, "Upcoming events", eventResult.error],
    [canGroups, "Group requests", groupResult.error],
    [canShop, "Shop orders", orderResult.error],
    [canGiving, "Pending giving", donationResult.error],
    [canDocuments, "Document requests", documentResult.error],
    [canContent, "Bulletin drafts", bulletinDraftResult.error],
    [canMedia, "Gallery", galleryResult.error],
    [canSermons, "Sermon planner", sermonResult.error],
    [canAttendance, "Service schedules", serviceResult.error],
    [canGiving, "Giving funds", fundResult.error],
    [canShop, "Products", productResult.error],
    [canDocuments, "Document templates", templateResult.error],
    [canContent, "Published bulletin", publishedBulletinResult.error],
    [canRoles, "Staff roles", roleAssignmentResult.error],
    [canSettings || canMedia, "Campus settings", campusResult.error],
  ];
  for (const [enabled, label, error] of queryErrors) {
    if (enabled) addQueryError(errors, label, error);
  }

  const workItems: WorkItem[] = [];
  if (canPeopleWrite) {
    workItems.push({ href: "/admin/visitors", title: "Visitor follow-up", description: "New connection cards waiting for a personal response.", count: visitorResult.count, unavailable: Boolean(visitorResult.error), tone: "blue" });
  }
  if (canDocuments) {
    workItems.push({ href: "/admin/documents", title: "Documents to prepare", description: "Requests waiting for the pastor’s office.", count: documentResult.count, unavailable: Boolean(documentResult.error), tone: "gold" });
  }
  if (canShop) {
    workItems.push({ href: "/admin/shop", title: "Orders to fulfil", description: "Paid or processing orders ready for the store team.", count: orderResult.count, unavailable: Boolean(orderResult.error), tone: "plum" });
  }
  if (canGiving) {
    workItems.push({ href: "/admin/giving", title: "Gift intents to reconcile", description: canManageGiving ? "Pending gifts ready to confirm or investigate." : "Pending gifts visible to the finance team.", count: donationResult.count, unavailable: Boolean(donationResult.error), tone: "green" });
  }
  if (canGroups) {
    workItems.push({ href: "/admin/groups", title: "Group join requests", description: "People waiting to hear from a group leader.", count: groupResult.count, unavailable: Boolean(groupResult.error), tone: "green" });
  }
  if (canContent) {
    workItems.push({ href: "/admin/bulletin", title: "Bulletin drafts", description: "Notices that have not been published yet.", count: bulletinDraftResult.count, unavailable: Boolean(bulletinDraftResult.error), tone: "gold" });
  }
  if (canMedia) {
    workItems.push({ href: "/admin/gallery", title: "Unpublished gallery items", description: "Church photos still waiting to go live.", count: galleryResult.count, unavailable: Boolean(galleryResult.error), tone: "rose" });
  }
  if (canSermons) {
    workItems.push({ href: "/pastor/sermons", title: "Sermons in draft", description: "Messages that can be completed or published.", count: sermonResult.count, unavailable: Boolean(sermonResult.error), tone: "plum" });
  }

  const quickActions: QuickAction[] = [];
  if (canPeopleWrite) quickActions.push({ href: "/admin/people", icon: "+", title: "Add a member", description: "Invite someone and create their profile", tone: "blue" });
  if (canAttendance) quickActions.push({ href: "/admin/attendance", icon: "◎", title: "Record attendance", description: "Submit a service headcount", tone: "green" });
  if (canDocuments) quickActions.push({ href: "/admin/documents", icon: "▤", title: "Prepare a document", description: "Work through office requests", tone: "gold" });
  if (canContent) quickActions.push({ href: "/admin/bulletin", icon: "✎", title: "Post a bulletin", description: "Publish a notice for members", tone: "gold" });
  if (canGiving) quickActions.push({ href: "/admin/giving", icon: "$", title: canManageGiving ? "Record giving" : "Review finance", description: canManageGiving ? "Add a gift or church expense" : "Open the finance dashboard", tone: "green" });
  if (canShop) quickActions.push({ href: "/admin/shop", icon: "□", title: "Manage the store", description: "Add products and fulfil orders", tone: "plum" });
  if (canMedia) quickActions.push({ href: "/admin/gallery", icon: "◫", title: "Update media", description: "Add photos or change the live link", tone: "rose" });
  if (canSermons) quickActions.push({ href: "/pastor/sermons", icon: "✦", title: "Open sermon planner", description: "Draft, edit, and publish messages", tone: "plum" });
  if (canEvents) quickActions.push({ href: "/admin/events", icon: "◇", title: "Create an event", description: "Add dates and registration details", tone: "blue" });
  if (canCommunicate) quickActions.push({ href: "/admin/communications", icon: "↗", title: "Send an email", description: "Write to one person or everyone", tone: "blue" });
  if (canRoles) quickActions.push({ href: "/admin/roles", icon: "⌁", title: "Invite staff", description: "Assign secure workspace access", tone: "neutral" });
  if (canSettings) quickActions.push({ href: "/admin/settings", icon: "⚙", title: "Church settings", description: "Update public contact details", tone: "neutral" });
  if (canGroups) quickActions.push({ href: "/admin/groups", icon: "◌", title: "Create a group", description: "Set up a ministry or small group", tone: "green" });
  if (canVolunteers) quickActions.push({ href: "/admin/volunteers", icon: "✓", title: "Plan a serving team", description: "Add shifts and assignments", tone: "gold" });

  const campus = campusResult.data as { id: string; phone: string | null; email: string | null; address_line1: string | null; livestream_url: string | null } | null;
  const setupChecks: SetupCheck[] = [];
  if (canSettings) {
    setupChecks.push({
      href: "/admin/settings",
      title: "Church contact details",
      description: campusResult.error ? "The campus record could not be checked." : "Make sure the address, phone, and email are public-ready.",
      complete: Boolean(campus?.address_line1 && campus.phone && campus.email),
      unavailable: Boolean(campusResult.error),
    });
  }
  if (canAttendance) {
    setupChecks.push({
      href: "/admin/attendance",
      title: "Weekly service schedule",
      description: serviceResult.error ? "Service schedules could not be checked." : "Services must exist before attendance can be recorded.",
      complete: (serviceResult.count ?? 0) > 0,
      unavailable: Boolean(serviceResult.error),
    });
  }
  if (canDocuments) {
    setupChecks.push({
      href: "/admin/documents",
      title: "Office document templates",
      description: templateResult.error ? "Document templates could not be checked." : "Keep at least one request type active for members.",
      complete: (templateResult.count ?? 0) > 0,
      unavailable: Boolean(templateResult.error),
    });
  }
  if (canGiving) {
    setupChecks.push({
      href: "/admin/giving",
      title: "Giving funds",
      description: fundResult.error ? "Giving funds could not be checked." : "Active funds give each gift a clear purpose.",
      complete: (fundResult.count ?? 0) > 0,
      unavailable: Boolean(fundResult.error),
    });
  }
  if (canShop) {
    setupChecks.push({
      href: "/admin/shop",
      title: "Store catalogue",
      description: productResult.error ? "Products could not be checked." : "Add a product so the church store is ready to use.",
      complete: (productResult.count ?? 0) > 0,
      unavailable: Boolean(productResult.error),
    });
  }
  if (canContent) {
    setupChecks.push({
      href: "/admin/bulletin",
      title: "Member bulletin",
      description: publishedBulletinResult.error ? "Published notices could not be checked." : "Publish at least one current church notice.",
      complete: (publishedBulletinResult.count ?? 0) > 0,
      unavailable: Boolean(publishedBulletinResult.error),
    });
  }
  if (canMedia) {
    setupChecks.push({
      href: "/admin/gallery",
      title: "Livestream destination",
      description: campusResult.error ? "The livestream setting could not be checked." : "Connect the video members should see on the Live page.",
      complete: Boolean(campus?.livestream_url),
      unavailable: Boolean(campusResult.error),
    });
  }
  if (canEvents) {
    setupChecks.push({
      href: "/admin/events",
      title: "Upcoming calendar",
      description: eventResult.error ? "Upcoming events could not be checked." : "Keep at least one future event published.",
      complete: (eventResult.count ?? 0) > 0,
      unavailable: Boolean(eventResult.error),
    });
  }
  if (canRoles) {
    setupChecks.push({
      href: "/admin/roles",
      title: "Staff access",
      description: roleAssignmentResult.error ? "Staff assignments could not be checked." : "Make sure every office team has the right workspace role.",
      complete: (roleAssignmentResult.count ?? 0) > 0,
      unavailable: Boolean(roleAssignmentResult.error),
    });
  }

  const availableChecks = setupChecks.filter((check) => !check.unavailable);
  const setupProgress = availableChecks.length
    ? Math.round((availableChecks.filter((check) => check.complete).length / availableChecks.length) * 100)
    : 0;
  const availableWork = workItems.filter((item) => !item.unavailable);
  const attentionTotal = availableWork.reduce((total, item) => total + (item.count ?? 0), 0);
  const firstWorkHref = workItems[0]?.href ?? quickActions[0]?.href ?? "/admin";

  const focus = roleCodes.has("super_admin")
    ? { eyebrow: "Whole-church command centre", description: "See every ministry’s operational pulse and move straight into the work that needs attention." }
    : roleCodes.has("secretary")
      ? { eyebrow: "Pastor’s office", description: "Keep documents, attendance, notices, and member communication moving." }
      : roleCodes.has("finance_officer")
        ? { eyebrow: "Finance office", description: "Reconcile giving, record expenses, and keep the financial picture current." }
        : roleCodes.has("media_coordinator")
          ? { eyebrow: "Media desk", description: "Keep sermons, church photos, and the livestream experience current." }
          : roleCodes.has("store_manager")
            ? { eyebrow: "Church store", description: "Keep the catalogue ready and move paid orders through fulfilment." }
            : { eyebrow: "Church operations", description: "Your tools and priorities are matched to the access assigned to you." };

  const firstName = profile?.first_name?.trim();
  const roleSummary = roleNames.length ? roleNames.join(" · ") : "Permission-based workspace";
  const today = now.toLocaleDateString("en-JM", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Jamaica" });

  return (
    <DashboardHome>
      <DashboardHero
        eyebrow={focus.eyebrow}
        title={firstName ? `Welcome back, ${firstName}.` : "Welcome to the church office."}
        description={focus.description}
        primaryAction={{ href: firstWorkHref, label: attentionTotal > 0 ? "Open priority work" : "Open your workspace" }}
        secondaryAction={canRoles ? { href: "/admin/roles", label: "Manage staff access" } : undefined}
        variant="admin"
        aside={
          <HeroSnapshot
            label={today}
            value={attentionTotal > 0 ? `${attentionTotal} to review` : "Desk is clear"}
            detail={`${roleSummary} · Select any card to open its working screen.`}
            href={firstWorkHref}
          />
        }
      />

      <QueryErrorNotice errors={errors} />

      {workItems.length > 0 ? (
        <MetricGrid>
          {workItems.map((item) => (
            <MetricLink
              key={item.href + item.title}
              href={item.href}
              icon={item.unavailable ? "!" : item.count ? "●" : "✓"}
              tone={item.tone}
              value={item.unavailable ? "—" : (item.count ?? 0)}
              label={item.title}
              detail={item.unavailable ? "Could not load; open the page or refresh to retry" : item.description}
            />
          ))}
        </MetricGrid>
      ) : (
        <EmptyState
          title="Your admin tools could not be determined"
          description="Refresh this page. If this remains empty, ask a super administrator to review your staff role."
          action={{ href: "/member/security", label: "Review account security" }}
        />
      )}

      <DashboardColumns>
        <DashboardPanel
          eyebrow="Work queue"
          title="What needs attention"
          description="Each row opens the screen where the work can be completed."
          action={workItems[0] ? { href: firstWorkHref, label: "Start working" } : undefined}
        >
          {workItems.length ? (
            <ActivityList>
              {workItems.map((item) => (
                <ActivityItem
                  key={item.href + item.title}
                  href={item.href}
                  title={item.title}
                  body={item.description}
                  badge={item.unavailable ? "Unavailable" : item.count ? `${item.count} waiting` : "Clear"}
                  badgeTone={item.unavailable ? "rose" : item.count ? item.tone : "green"}
                />
              ))}
            </ActivityList>
          ) : (
            <EmptyState title="No work queue is available" description="Your role may still need its permissions assigned." action={{ href: "/member/security", label: "Review account" }} />
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="Do something"
          title="Quick actions"
          description="These are the tools your current staff access allows."
          tone="warm"
        >
          {quickActions.length ? (
            <QuickActionGrid>
              {quickActions.map((action) => (
                <QuickActionLink key={action.href + action.title} {...action} />
              ))}
            </QuickActionGrid>
          ) : (
            <EmptyState title="No actions are assigned" description="Ask a super administrator to check your staff role and permissions." />
          )}
        </DashboardPanel>
      </DashboardColumns>

      {setupChecks.length > 0 && (
        <DashboardPanel
          eyebrow="Workspace readiness"
          title="Setup checklist"
          description="Open any row to add or edit the underlying church information."
          tone="softBlue"
        >
          <ProgressMeter value={setupProgress} label="Available checks completed" />
          <SetupList>
            {setupChecks.map((check) => (
              <SetupItem key={check.href + check.title} {...check} />
            ))}
          </SetupList>
        </DashboardPanel>
      )}

      {canEvents && (
        <DashboardPanel
          eyebrow="Calendar"
          title="Upcoming published events"
          description="A healthy calendar gives members something concrete to register for and share."
          action={{ href: "/admin/events", label: "Add or edit events" }}
          tone="warm"
        >
          {eventResult.error ? (
            <EmptyState title="The event calendar is unavailable" description="Open Events or refresh to try this query again." action={{ href: "/admin/events", label: "Open Events" }} />
          ) : (eventResult.count ?? 0) > 0 ? (
            <ActivityItem href="/admin/events" title={`${eventResult.count} upcoming event${eventResult.count === 1 ? "" : "s"} published`} body="Open the event manager to edit dates, details, visibility, or registration." badge="Live" badgeTone="green" />
          ) : (
            <EmptyState title="Nothing is published ahead" description="Create the next service, ministry activity, or church event." action={{ href: "/admin/events", label: "Create an event" }} />
          )}
        </DashboardPanel>
      )}
    </DashboardHome>
  );
}
