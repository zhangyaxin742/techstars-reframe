import { Gear, Graph, House, SquaresFour } from "@phosphor-icons/react";
import { AppShell, type ShellNavItem } from "@/components/app-shell";

export function App() {
  const navItems: ShellNavItem[] = [
    { id: "home", label: "Home", icon: House, href: "#home" },
    { id: "canvas", label: "Canvas", icon: Graph, href: "#canvas", active: true },
    { id: "library", label: "Library", icon: SquaresFour, href: "#library" },
  ];

  const footerItems: ShellNavItem[] = [
    { id: "settings", label: "Settings", icon: Gear, href: "#settings" },
  ];

  return (
    <AppShell
      brand={{ name: "Reframe" }}
      navItems={navItems}
      footerItems={footerItems}
    >
      <section className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-balance text-2xl font-semibold">
            Reusable shell ready
          </h1>
          <p className="mt-3 text-pretty text-sm text-muted-foreground">
            A clean app frame is in place. The infinite canvas demo is the next
            extraction layer.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
