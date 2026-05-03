import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrendingWorkspace } from "./trending-workspace";

describe("TrendingWorkspace", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps hover previews muted and enables audio only after an explicit click", async () => {
    const user = userEvent.setup();
    render(<TrendingWorkspace titleClassName="font-test" />);

    const founderTile = screen.getByTestId("trending-video-tile-trend-1");
    const founderVideo = screen.getByLabelText("Founder confessional") as HTMLVideoElement;

    expect(founderVideo.autoplay).toBe(true);
    expect(founderVideo.loop).toBe(true);
    expect(founderVideo.playsInline).toBe(true);
    expect(founderVideo.muted).toBe(true);
    expect(founderVideo.volume).toBe(0);
    expect(screen.getByText("Click for audio")).toBeInTheDocument();

    fireEvent.mouseEnter(founderTile);
    expect(founderVideo.muted).toBe(true);
    expect(founderVideo.volume).toBe(0);

    await user.click(screen.getByLabelText("Play sound for Founder confessional"));

    await waitFor(() => {
      expect(founderVideo.muted).toBe(false);
      expect(founderVideo.volume).toBe(1);
    });
    expect(screen.getByLabelText("Mute Founder confessional")).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.mouseLeave(founderTile);

    await waitFor(() => {
      expect(founderVideo.muted).toBe(true);
      expect(founderVideo.volume).toBe(0);
    });
    expect(screen.getByLabelText("Play sound for Founder confessional")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("keeps only one trending tile audible at a time", async () => {
    const user = userEvent.setup();
    render(<TrendingWorkspace titleClassName="font-test" />);

    const founderVideo = screen.getByLabelText("Founder confessional") as HTMLVideoElement;
    const processVideo = screen.getByLabelText("Process cutdown") as HTMLVideoElement;

    await user.click(screen.getByLabelText("Play sound for Founder confessional"));
    await waitFor(() => expect(founderVideo.muted).toBe(false));

    await user.click(screen.getByLabelText("Play sound for Process cutdown"));

    await waitFor(() => {
      expect(founderVideo.muted).toBe(true);
      expect(founderVideo.volume).toBe(0);
      expect(processVideo.muted).toBe(false);
      expect(processVideo.volume).toBe(1);
    });
    expect(screen.getByLabelText("Mute Process cutdown")).toHaveAttribute("aria-pressed", "true");
  });
});
