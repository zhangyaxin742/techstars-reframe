import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the AI chat sidebar and canvas without the navigation menu", () => {
    render(<App />);

    expect(screen.getByText("Chat History")).toBeInTheDocument();
    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.getByText("Preparing your creative canvas")).toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByText("Canvas workspace")).not.toBeInTheDocument();
  });

  it("advances the initial simulated tool calls into recipe-ready canvas nodes", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByTestId("simulated-tool-tool-build-recipes")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.getByText("Side-by-Side Fit Failure Demo")).toBeInTheDocument();
  });

  it("selecting a trend recipe runs the timeline generation flow", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    fireEvent.click(screen.getByTestId("canvas-node-recipe-1"));

    expect(screen.getByText("Auto-filling the timeline")).toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-match-clips")).toHaveAttribute(
      "data-tool-state",
      "running"
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("timeline-assembly")).toBeInTheDocument();
    expect(screen.getByTestId("media-library-panel")).toBeInTheDocument();
  });

  it("bottom prompt submit appends user prompt and simulated tool activity", async () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    fireEvent.change(screen.getByPlaceholderText("Ask Reframe to build, edit, or remix..."), {
      target: { value: "Suggest missing shots" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByText("Suggest missing shots")).toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-refine-current-canvas")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
  });
});
