"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openNavigation = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setNavigationOpen(true);
  }, []);

  const closeNavigation = useCallback(() => {
    setNavigationOpen(false);
  }, []);

  useEffect(() => {
    if (!navigationOpen) return;

    const drawer = document.getElementById("workspace-navigation");
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const previousOverflow = document.body.style.overflow;

    document.body.classList.add("dashboard-drawer-open");
    document.body.style.overflow = "hidden";
    drawer?.querySelector<HTMLElement>(".dashboard-nav-close")?.focus();

    function handleDrawerKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNavigation();
        return;
      }

      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleDrawerKeys);
    return () => {
      window.removeEventListener("keydown", handleDrawerKeys);
      document.body.classList.remove("dashboard-drawer-open");
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [closeNavigation, navigationOpen]);

  useEffect(() => {
    const drawer = document.getElementById("workspace-navigation");
    const mobile = window.matchMedia("(max-width: 1024px)");

    function syncDrawerAvailability() {
      if (drawer) drawer.inert = mobile.matches && !navigationOpen;
      if (!mobile.matches && navigationOpen) closeNavigation();
    }

    syncDrawerAvailability();
    mobile.addEventListener("change", syncDrawerAvailability);
    return () => {
      mobile.removeEventListener("change", syncDrawerAvailability);
      if (drawer) drawer.inert = false;
    };
  }, [closeNavigation, navigationOpen]);

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
        onOpenNavigation={openNavigation}
      />
      <div className="workspace-frame">
        <DashboardNav
          title={title}
          subtitle={subtitle}
          sections={sections}
          user={user}
          workspaces={workspaces}
          open={navigationOpen}
          onClose={closeNavigation}
        />
        <main className="dashboard-main" id="dashboard-main" tabIndex={-1}>
          <div className="dashboard-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
