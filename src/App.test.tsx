import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the AI chat sidebar and canvas without the navigation menu", () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByTestId("chat-history-panel")).toHaveTextContent("Building Brand Context");
    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.queryByText("Preparing your creative canvas")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();
    expect(screen.queryByText("1. Paste Brand Sources")).not.toBeInTheDocument();
    expect(screen.queryByText("2. Connect Media")).not.toBeInTheDocument();
    expect(screen.queryByText("3. Analyze Brand")).not.toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByText("Canvas workspace")).not.toBeInTheDocument();
  });

  it("separates brand context creation from trend recipe generation", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(12500);
    });
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText("Okay, brand context created.")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-build-brand-context")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
  });

  it("shows trend recipe skeletons during search before revealing generated cards", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(10600);
    });

    expect(screen.getByTestId("simulated-tool-tool-search-web")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
    expect(screen.getByTestId("trend-recipe-skeleton-recipe-1")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7300);
    });

    expect(screen.getByTestId("simulated-tool-tool-build-recipes")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx").style.transform).toBe("translate(0px, 0px)");
    expect(screen.getByTestId("canvas-node-recipe-1").style.transform).toBe("translate(1096px, 0px)");
    expect(screen.getByTestId("canvas-node-recipe-2").style.transform).toBe("translate(1096px, 264px)");
    expect(screen.getByTestId("canvas-node-recipe-3").style.transform).toBe("translate(1096px, 528px)");
    expect(screen.getByText("Side-by-Side Fit Failure Demo")).toBeInTheDocument();
    expect(screen.queryByTestId("trend-recipe-skeleton-recipe-1")).not.toBeInTheDocument();
  });

  it("clicking a trend recipe plus action runs the timeline generation flow", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });
    fireEvent.click(screen.getByTestId("canvas-node-create-timeline-recipe-1"));

    expect(screen.getByText("Auto-filling the timeline")).toBeInTheDocument();
    expect(screen.queryByTestId("canvas-node-create-timeline-recipe-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-connection-r1-tl")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-node-skeleton-timeline-1")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-timeline-1").style.transform).toBe("translate(1492px, 0px)");
    expect(screen.getByTestId("simulated-tool-tool-match-clips")).toHaveAttribute(
      "data-tool-state",
      "running"
    );

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.getByText(/Timeline is filled/)).toBeInTheDocument();
    expect(screen.getByText("Side-by-Side Fit Failure Demo — Timeline")).toBeInTheDocument();
  });

  it("does not start timeline generation when clicking the recipe card body", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });

    fireEvent.click(screen.getByTestId("canvas-node-recipe-1"));

    expect(screen.queryByText("Auto-filling the timeline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("simulated-tool-tool-match-clips")).not.toBeInTheDocument();
  });

  it("bottom prompt submit appends user prompt and simulated tool activity", async () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });

    fireEvent.change(screen.getByPlaceholderText("Ask Reframe anything..."), {
      target: { value: "Suggest missing shots" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Suggest missing shots")).toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-refine-current-canvas")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
  });

  it("renders user messages as dark chat cards without avatar icons", () => {
    vi.useFakeTimers();
    render(<App />);

    const userMessage = screen.getByText(/Here are the brand links and product media/);
    expect(userMessage).toHaveClass("bg-foreground");
    expect(userMessage).toHaveClass("text-background");
    expect(screen.queryByTestId("chat-message-avatar")).not.toBeInTheDocument();
  });

  it("starts from the submitted launch prompt with badges before analysis starts", () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByText(/Create a pre-order launch video/)).toBeInTheDocument();
    expect(screen.getByText("Product media")).toBeInTheDocument();
    expect(screen.getByText("Camera roll")).toBeInTheDocument();
    expect(screen.queryByText("Starting Reframe")).not.toBeInTheDocument();
    expect(screen.queryByText(/What would you like to create/)).not.toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "running"
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
  });
});
