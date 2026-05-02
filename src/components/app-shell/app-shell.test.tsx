import React from "react";
import { Gear, Graph, House } from "@phosphor-icons/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders active navigation and shell content", () => {
    render(
      <AppShell
        brand={{ name: "Reframe" }}
        navItems={[
          { id: "home", label: "Home", icon: House, href: "#home" },
          { id: "canvas", label: "Canvas", icon: Graph, href: "#canvas", active: true },
        ]}
        footerItems={[{ id: "settings", label: "Settings", icon: Gear, href: "#settings" }]}
      >
        <div>Workspace content</div>
      </AppShell>
    );

    expect(screen.getByText("Reframe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /canvas/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
  });

  it("collapses and expands the sidebar", async () => {
    const user = userEvent.setup();
    render(
      <AppShell
        brand={{ name: "Reframe" }}
        navItems={[{ id: "canvas", label: "Canvas", icon: Graph, href: "#canvas", active: true }]}
      >
        <div />
      </AppShell>
    );

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
