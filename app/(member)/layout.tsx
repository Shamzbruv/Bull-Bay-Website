import { SimpleDashboardNav } from "@/components/simple-dashboard-nav";
import { SimpleDashboardTopbar } from "@/components/simple-dashboard-topbar";

const NAV_ITEMS = [
  { href: "/member", label: "Home" },
  { href: "/member/profile", label: "Profile" },
  { href: "/member/household", label: "Household" },
  { href: "/member/events", label: "Events" },
  { href: "/member/groups", label: "Groups" },
  { href: "/member/ministry", label: "My Ministry & Serving" },
  { href: "/member/serving", label: "Serving" },
  { href: "/member/documents", label: "Documents" },
  { href: "/member/counsel", label: "Pastor & Calendar" },
  { href: "/member/directory", label: "Member Directory" },
  { href: "/member/attendance", label: "Attendance" },
  { href: "/member/giving", label: "Giving" },
  { href: "/member/orders", label: "Orders & Downloads" },
  { href: "/member/notifications", label: "Notifications" },
  { href: "/member/security", label: "Security" },
];

// See components/simple-dashboard-nav.tsx for why this doesn't use
// components/dashboard-nav.tsx / dashboard-topbar.tsx.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimpleDashboardTopbar label="My Church" />
      <div className="dashboard-shell">
        <SimpleDashboardNav title="My Church" items={NAV_ITEMS} />
        <div className="dashboard-main">{children}</div>
      </div>
    </>
  );
}
