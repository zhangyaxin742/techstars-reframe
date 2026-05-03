import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import type { ChatMessage } from "../../data/reframe-demo";
import { ChatHistoryPanel } from "./chat-history-panel";

const streamingMessage: ChatMessage = {
  id: "assistant-stream",
  role: "assistant",
  content: "This assistant response keeps streaming after collapse.",
  timestamp: 1,
  step: "analysis",
};

describe("ChatHistoryPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not restart streamed text when the panel is hidden and shown", () => {
    vi.useFakeTimers();
    const { container } = render(<ChatHistoryPanel messages={[streamingMessage]} />);
    const getStreamedText = () =>
      container.querySelector('[data-message-role="assistant"] .whitespace-pre-wrap')?.textContent ??
      "";

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(getStreamedText()).toContain("This ass");

    fireEvent.click(screen.getAllByRole("button", { name: "Collapse chat history" })[0]);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole("button", { name: "Expand chat history" }));

    expect(getStreamedText()).toContain("This assistant response keeps");
  });
});
