import { CaretDoubleLeft, CaretDoubleRight } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ShellBrand, ShellNavItem } from "./types";

interface AppSidebarProps {
  brand: ShellBrand;
  navItems: ShellNavItem[];
  footerItems?: ShellNavItem[];
}

function SidebarLink({ item, collapsed }: { item: ShellNavItem; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <a
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-muted outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
        item.active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
        collapsed && "justify-center"
      )}
    >
      <Icon className="size-4 shrink-0" weight={item.active ? "fill" : "regular"} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </a>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar({ brand, navItems, footerItems = [] }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-collapsed={collapsed}
        className={cn(
          "flex h-dvh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-150 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {brand.mark ?? brand.name.slice(0, 1)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{brand.name}</div>
              <div className="text-xs text-sidebar-muted">Reusable workspace</div>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {navItems.map((item) => (
            <SidebarLink key={item.id} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="space-y-1 border-t px-2 py-3">
          {footerItems.map((item) => (
            <SidebarLink key={item.id} item={item} collapsed={collapsed} />
          ))}
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full", !collapsed && "justify-start")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <CaretDoubleRight /> : <CaretDoubleLeft />}
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
