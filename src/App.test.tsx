import { render, screen } from "@testing-library/react";
import React from "react";
import { App } from "./App";

describe("App", () => {
  it("renders the canvas without the app sidebar shell", () => {
    render(<App />);

    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByText("Canvas workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Chat History")).not.toBeInTheDocument();
  });
});
