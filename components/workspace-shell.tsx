"use client";

import { useEffect, useState } from "react";
import { DashboardNav, type DashboardNavSection, type DashboardUser, type WorkspaceDestination } from "@/components/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard-topbar";

export function WorkspaceShell({
  title,
  subtitle,
  tone,
  sections,
  user,
  workspaces,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "member" | "admin" | "pastor";
  sections: DashboardNavSection[];
  user: DashboardUser;
  workspaces: WorkspaceDestination[];
  children: React.ReactNode;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNavigationOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dashboard-drawer-open", navigationOpen);
    return () => document.body.classList.remove("dashboard-drawer-open");
  }, [navigationOpen]);

  return (
    <div className="workspace-root" data-workspace={tone}>
      <a className="workspace-skip-link" href="#dashboard-main">
        Skip to dashboard content
      </a>
      <DashboardTopbar
        label={title}
        user={user}
        workspaces={workspaces}
        navigationOpen={navigationOpen}
        onOpenNavigation={() => setNavigationOpen(true)}
      />
      <div className="workspace-frame">
        <DashboardNav
          title={title}
          subtitle={subtitle}
          sections={sections}
          user={user}
          workspaces={workspaces}
          open={navigationOpen}
          onClose={() => setNavigationOpen(false)}
        />
        <main className="dashboard-main" id="dashboard-main" tabIndex={-1}>
          <div className="dashboard-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
