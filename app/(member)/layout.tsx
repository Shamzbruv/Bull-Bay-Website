import { DashboardNav } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";

const NAV_ITEMS = [
  { href: "/member", label: "Home" },
  { href: "/member/profile", label: "Profile" },
  { href: "/member/household", label: "Household" },
  { href: "/member/events", label: "Events" },
  { href: "/member/groups", label: "Groups" },
  { href: "/member/ministry", label: "My Ministry & Serving" },
  { href: "/member/serving", label: "Serving" },
  { href: "/member/giving", label: "Giving" },
  { href: "/member/orders", label: "Orders & Downloads" },
  { href: "/member/notifications", label: "Notifications" },
  { href: "/member/security", label: "Security" },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardTopbar label="My Church" />
      <div className="dashboard-shell">
        <DashboardNav title="My Church" items={NAV_ITEMS} />
        <div className="dashboard-main">{children}</div>
      </div>
    </>
  );
}
