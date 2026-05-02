import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CanvasPromptBox } from "./canvas-prompt-box";

function PromptHarness({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <CanvasPromptBox
      title="Prompt"
      data={{ value, actionLabel: "Send", placeholder: "Describe a step" }}
      onChange={setValue}
      onSubmit={onSubmit}
    />
  );
}

describe("CanvasPromptBox", () => {
  it("submits the current prompt from the send control", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptHarness onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText("Describe a step"), "Add a summary");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith("Add a summary");
  });

  it("supports keyboard submit without blocking multiline typing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptHarness onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText("Describe a step");
    await user.type(input, "First line{shift>}{enter}{/shift}Second line");
    expect(input).toHaveValue("First line\nSecond line");

    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    expect(onSubmit).toHaveBeenCalledWith("First line\nSecond line");
  });

  it("keeps the submit control unavailable while the prompt is empty", () => {
    const onSubmit = vi.fn();
    render(<PromptHarness onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("renders collapsed prompt details without a textbox", () => {
    render(
      <CanvasPromptBox
        title="Prompt"
        data={{ value: "Accepted direction", badges: ["Canvas"], mode: "collapsed" }}
      />
    );

    expect(screen.getByText("Accepted direction")).toBeInTheDocument();
    expect(screen.getByText("Canvas")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
