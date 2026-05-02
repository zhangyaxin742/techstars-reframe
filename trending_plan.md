• Proposed Plan


  # Hidden Trending Workspace Page

  ## Summary

  Add a new hidden desktop-first route at /trending that does not appear
  anywhere on the current landing page. The page should feel like a CapCut-
  style creation workspace adapted to Reframe’s palette: dark studio
  background, glassmorphic app bar, bold editorial title treatment for “What’s
  Trending,” a wide Instagram trend lane, a narrower Explore rail on the side,
  and a prominent Create / Remix CTA.

  ## Key Changes

  - Create a new /trending page as a standalone workspace, separate from the
    current / landing route.
  - Build a minimal glassmorphic top bar for the route rather than reusing the
    marketing nav.
  - Add a stronger top-of-page title treatment for “What’s Trending,” likely by
    introducing one additional display font via next/font for this route while
    preserving existing global typography elsewhere.
  - Compose the main desktop layout as:
      - A primary center/left content area with an “Instagram” banner/header
        and the trend*.mp4 videos grouped beneath it.
      - A secondary right-side rail with the explore*.mp4 videos stacked or
        tiled as supporting content.
      - A Create / Remix action positioned as a workspace control, not a
        marketing CTA.
  - Use the existing local video assets from public/videos and map them
    explicitly into trend and explore groups rather than introducing new data
    plumbing.
  - Style the page as a blank-canvas creation environment: darker backdrop,
    layered gradients/grain, glass panels, sharper corners, and stronger
    desktop spacing than the current landing hero.
  - Keep the route accessible directly by URL only; do not add links, buttons,
    or discoverability from the landing page.

  ## Behavior / Interfaces

  - No backend or API changes.
  - No global navigation changes outside this route.
  - Add a small route-local video card model or array structure containing:
      - src
      - label
      - variant (trend or explore)
  - Video behavior:
      - Default state: muted autoplay loops.
      - Hover behavior: the hovered card becomes the active/focused card and
        plays with audio if browser autoplay rules permit; otherwise it should
        still visually elevate and continue muted without breaking layout.
  - CTA behavior in v1:
      - Render as a visual control only with no modal, navigation, or
        submission flow wired yet.

  ## Test Plan

  - Confirm / remains unchanged and /trending renders independently.
  - Confirm no element on the landing page links to /trending.
  - Verify desktop layout at common widths (1280, 1440, 1536+) keeps the
    Instagram lane dominant and the Explore rail clearly secondary.
  - Verify smaller widths collapse gracefully without overlapping title, rail,
    or CTA.
    playback without console errors.
  - Run npm run build and npm run typecheck.

  ## Assumptions
    display font for the heading rather than reworking the site-wide font
    system.
  - “Instagram banner” means a section banner/header labeling the trend lane,
    not a brand-authentic Instagram UI clone.
  - The hover-with-audio request is implemented as progressive enhancement on
    top of muted autoplay because browsers may block instant unmuted playback.
  - Mobile is supported responsively, but the design priority is desktop and
    should lean much more toward workspace UI than marketing page composition.