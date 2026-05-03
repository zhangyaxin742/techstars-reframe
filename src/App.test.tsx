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

    expect(screen.getByTestId("chat-history-panel")).toHaveTextContent("Chat History");
    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.queryByText("Preparing your creative canvas")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();
    expect(screen.queryByText("1. Paste Brand Sources")).not.toBeInTheDocument();
    expect(screen.queryByText("2. Connect Media")).not.toBeInTheDocument();
    expect(screen.queryByText("3. Analyze Brand")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4300);
    });
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
      vi.advanceTimersByTime(16500);
    });
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText(/searching the web, Instagram, TikTok/i)).toBeInTheDocument();
    expect(screen.getByTestId("trend-recipe-skeleton-recipe-1")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4800);
    });
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId("simulated-tool-tool-build-recipes")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.getByText("Side-by-Side Fit Failure Demo")).toBeInTheDocument();
    expect(screen.queryByTestId("trend-recipe-skeleton-recipe-1")).not.toBeInTheDocument();
  });

  it("selecting a trend recipe runs the timeline generation flow", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });
    fireEvent.click(screen.getByTestId("canvas-node-recipe-1"));

    expect(screen.getByText("Auto-filling the timeline")).toBeInTheDocument();
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

    act(() => {
      vi.advanceTimersByTime(2700);
    });

    const userMessage = screen.getByText(/Here are the brand links and product media/);
    expect(userMessage).toHaveClass("bg-foreground");
    expect(userMessage).toHaveClass("text-background");
    expect(screen.queryByTestId("chat-message-avatar")).not.toBeInTheDocument();
  });

  it("reveals landing chat turns one-by-one before analysis starts", () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.queryByText(/Here are the brand links and product media/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByText("Starting Reframe")).toBeInTheDocument();
    expect(screen.queryByText(/Here are the brand links and product media/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByText("What would you like to create? Paste your brand links, upload media, and let AI do the rest.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText(/Here are the brand links and product media/)).toBeInTheDocument();
    expect(screen.queryByTestId("simulated-tool-tool-read-sources")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1700);
    });
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
  });
});
