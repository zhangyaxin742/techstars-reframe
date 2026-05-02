 # Reframe Landing Page Plan

  ## Summary

  Build a new root-level Next.js App Router landing page that implements the PRD’s single-screen hero concept rather than
  modifying the existing Vite app in clone/artifacts/reframe. The page will use the existing local assets in public/
  assets for the painting and phone frame, recreate Cleo’s design principles in Reframe’s visual language, and ship with
  a provider-ready waitlist modal backed by a local API route and adapter interface.

  ## Key Changes

  ### App foundation

  - Scaffold a new root Next.js app with App Router, Tailwind, and Framer Motion.
  - Keep the existing clone/ workspace untouched; the new landing lives at the repo root as the canonical marketing
    surface.
  - Add root app/layout.tsx, app/page.tsx, global styles, font setup, and metadata for Reframe.
  - Use Cormorant Garamond for display and Instrument Sans for UI/body, loaded through Next font tooling with only needed
    weights.

  ### Hero composition

  - Implement a single full-viewport hero with fixed/floating nav, centered editorial headline block, floating phone
    mockup, and one primary CTA.
  - Use public/assets/painting-bg.png as the locked background asset and treat it as the Thomas Cole image source for v1.
  - Build layered background treatment:
      - base painting image via next/image or absolutely positioned optimized image
      - slow Ken Burns scale animation from 1 to 1.15 over 28s, alternating infinitely
      - dark vignette overlay
      - warm multiply tint overlay
      - subtle grain texture layer from CSS/SVG
  - Keep the page intentionally single-screen with no extra marketing sections in v1.

  ### Component structure

  - Create a focused landing component set:
      - components/landing/nav.tsx
      - components/landing/hero.tsx
      - components/landing/phone-mockup.tsx
      - components/landing/waitlist-modal.tsx
  - Hero owns layout orchestration and motion timing.
  - PhoneMockup uses public/assets/phone-frame.png if it holds up visually; otherwise fall back to a CSS-built premium
    phone shell while preserving the same screen content and proportions.
  - The phone screen should render the PRD’s Reframe-specific chat:
      - founder pain statement from user
      - AI response reframing channel strategy
      - final “3 posts ready to copy” card
  - CTA placement: primary button below the phone on desktop and tucked closer to the mockup on smaller screens to
    preserve vertical fit.

  ### Styling and motion

  - Define landing-specific CSS variables for cream, ink, gold, warm, and shadow.
  - Avoid the current repo’s generic warm-SaaS theme; this landing should feel editorial, cinematic, and painterly.
  - Implement staggered fadeUp entrance animations for nav, eyebrow, headline lines, subhead, CTA, and phone.
  - Add a subtle float loop to the phone after initial reveal.
  - Respect prefers-reduced-motion by disabling Ken Burns and float loops while keeping static composition intact.
  - Do not implement audio in v1.
  - Do not include the optional social-proof line under the phone in v1.

  ### Waitlist flow

  - Implement modal-based email capture, opened from nav CTA and hero CTA.
  - Add a root API route such as app/api/waitlist/route.ts that accepts POST with { email: string }.
  - Validate email server-side and return explicit JSON success/error states for the modal.
  - Introduce a small adapter boundary for provider wiring, e.g. lib/waitlist/submit.ts, so UI code never depends on
    Loops/Mailchimp directly.
  - For this phase, ship a provider-ready scaffold only:
      - no direct Loops/Mailchimp integration yet
      - API route should be env-gated and clearly return a non-production “not configured” failure unless a provider
        adapter is wired
      - modal must support idle, submitting, success, and error states

  ## Public APIs / Interfaces / Types

  - POST /api/waitlist
      - Request body: { email: string }
      - Success response: { ok: true }
      - Error response: { ok: false, error: string }
  - Add a server-side adapter interface along the lines of:
      - submitWaitlistEmail(email: string): Promise<void>
  - Modal props should be minimal:
      - open: boolean
      - onOpenChange(open: boolean): void

  ## Test Plan

  - Verify the page renders correctly at:
      - iPhone SE
      - iPhone 15 width
      - iPad/tablet width
      - 1440px desktop
      - 2560px desktop
  - Verify visual behavior:
      - painting fills viewport without awkward focal cropping
      - Ken Burns, vignette, tint, and grain are visible but restrained
      - phone remains centered and bottom-anchored across breakpoints
      - headline and CTA stay readable over the painting
  - Verify interaction behavior:
      - both CTAs open the modal
      - invalid email shows inline validation error
      - configured API success shows confirmation state
      - unconfigured provider path shows a clear non-success error state, not a fake success
  - Verify engineering quality:
      - no layout shift around hero image or phone
      - no console/runtime errors
      - prefers-reduced-motion degrades gracefully
      - mobile Lighthouse target is pursued through optimized assets, constrained fonts, and minimal JS

  ## Assumptions and Defaults

  - The new implementation target is a root-level Next.js app, not the nested Vite frontend.
    landing carry over.
  - Waitlist integration is intentionally scaffold-only for this phase; production signup delivery remains blocked until
    a real provider adapter is connected.
  - The optional custom cursor is lower priority and should be omitted if it risks mobile polish, accessibility, o