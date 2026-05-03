import { render, screen } from "@testing-library/react";
import React from "react";
import { App } from "./App";

describe("App", () => {
  it("renders the AI chat sidebar and canvas without the navigation menu", () => {
    render(<App />);

    expect(screen.getByText("Chat History")).toBeInTheDocument();
    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByText("Canvas workspace")).not.toBeInTheDocument();
  });
});
