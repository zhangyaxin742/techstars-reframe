import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AppWorkspace } from "./AppWorkspace";

function renderWorkspace() {
  return render(
    React.createElement(AppWorkspace, {
      workspaceSlug: "petite-outdoors",
      projectSlug: "preorder-launch",
    })
  );
}

function revealRecipes() {
  act(() => {
    vi.advanceTimersByTime(20000);
  });
}

function revealStoryboard() {
  revealRecipes();
  fireEvent.click(screen.getByLabelText("Build storyboard from Founder Confessional"));
  act(() => {
    vi.advanceTimersByTime(5000);
  });
}

describe("AppWorkspace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the MVP workspace without demo-only overclaims", () => {
    renderWorkspace();

    expect(screen.getByTestId("chat-history-panel")).toHaveTextContent("Extracting Context");
    expect(screen.getByPlaceholderText("Ask Reframe to revise this post...")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Trend Video")).not.toBeInTheDocument();
    expect(screen.queryByText("Post to Instagram")).not.toBeInTheDocument();
    expect(screen.queryByText("CapCut")).not.toBeInTheDocument();
    expect(screen.queryByText("Adobe Premiere Pro")).not.toBeInTheDocument();
    expect(screen.queryByText("DaVinci Resolve")).not.toBeInTheDocument();
  });

  it("reveals curated founder-led recipes and build-storyboard action", () => {
    renderWorkspace();
    revealRecipes();

    expect(screen.getAllByText("Labeled Media").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Format Example").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Curated demo example").length).toBeGreaterThan(0);
    expect(screen.getByTestId("canvas-node-brand-ctx")).not.toHaveTextContent(
      "Trend Matching Signals"
    );
    expect(screen.getByLabelText("Build storyboard from Founder Confessional")).toBeInTheDocument();
    expect(screen.queryByText("Searching Instagram")).not.toBeInTheDocument();
    expect(screen.queryByText("Searching TikTok")).not.toBeInTheDocument();
    expect(screen.queryByText("Searching Trends")).not.toBeInTheDocument();
  });

  it("applies deterministic prompt edits and shows editorial memory", () => {
    renderWorkspace();
    revealStoryboard();

    fireEvent.change(screen.getByPlaceholderText("Ask Reframe to revise this post..."), {
      target: { value: "make hook more direct" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByTestId("editorial-memory-card")).toHaveTextContent(
      "Saved to Editorial Memory"
    );
    expect(screen.getByTestId("editorial-memory-card")).toHaveTextContent(
      "Use direct fit-proof hooks"
    );
    expect(screen.getByText(/5'2 frame/)).toBeInTheDocument();
    expect(screen.queryByText("Publishing to Instagram")).not.toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  it("uses MVP export labels for selected storyboard and preview nodes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const createObjectUrl = vi.fn(() => "blob:test");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    renderWorkspace();
    revealStoryboard();

    fireEvent.click(screen.getByTestId("infinite-canvas"));
    fireEvent.click(screen.getByTestId("canvas-node-timeline-1"), { shiftKey: true });
    expect(screen.getByLabelText("Download handoff")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Download handoff"));
    expect(screen.getByText("Markdown brief")).toBeInTheDocument();
    expect(screen.getByText("JSON package")).toBeInTheDocument();
    expect(screen.getByText("Shot list CSV")).toBeInTheDocument();
    expect(screen.getByText("Copy script")).toBeInTheDocument();
    expect(screen.queryByText("CapCut")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("canvas-node-preview-1"));
    fireEvent.click(screen.getByLabelText("Download content brief"));

    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalled();
    expect(screen.queryByLabelText("Post to Instagram")).not.toBeInTheDocument();
  });
});
