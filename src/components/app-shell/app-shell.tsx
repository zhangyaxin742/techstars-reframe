import React from "react";
import { AppSidebar } from "./app-sidebar";
import type { AppShellProps } from "./types";

export function AppShell({ brand, navItems, footerItems, children }: AppShellProps) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
      <AppSidebar brand={brand} navItems={navItems} footerItems={footerItems} />
      <main
        data-sidebar-inset
        className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      >
        {children}
      </main>
    </div>
  );
}
