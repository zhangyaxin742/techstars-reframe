import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export interface ShellBrand {
  name: string;
  mark?: ReactNode;
}

export interface ShellNavItem {
  id: string;
  label: string;
  icon: Icon;
  href: string;
  active?: boolean;
}

export interface AppShellProps {
  brand: ShellBrand;
  navItems: ShellNavItem[];
  footerItems?: ShellNavItem[];
  children: ReactNode;
}
