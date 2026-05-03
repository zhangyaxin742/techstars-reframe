import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { mediaAssets } from "../../data/reframe-demo";
import { MediaLibraryPanel } from "./media-library-panel";

describe("MediaLibraryPanel", () => {
  it("renders nothing when closed", () => {
    render(
      <MediaLibraryPanel assets={mediaAssets} open={false} onClose={vi.fn()} />
    );
    expect(screen.queryByTestId("media-library-panel")).not.toBeInTheDocument();
  });

  it("renders media assets when open", () => {
    render(
      <MediaLibraryPanel assets={mediaAssets} open={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId("media-library-panel")).toBeInTheDocument();
    expect(screen.getByText("Uphill trail movement")).toBeInTheDocument();
    expect(screen.getByText("Hem fit close-up")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MediaLibraryPanel assets={mediaAssets} open={true} onClose={onClose} />
    );
    await user.click(screen.getByRole("button", { name: "Close media library" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("filters assets by search term", async () => {
    const user = userEvent.setup();
    render(
      <MediaLibraryPanel assets={mediaAssets} open={true} onClose={vi.fn()} />
    );
    await user.type(screen.getByPlaceholderText("Search media..."), "hem");
    expect(screen.getByText("Hem fit close-up")).toBeInTheDocument();
    expect(screen.queryByText("Uphill trail movement")).not.toBeInTheDocument();
  });
});
