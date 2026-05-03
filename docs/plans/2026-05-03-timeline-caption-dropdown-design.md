# Timeline Caption Dropdown Design

## Context
The `/app` demo drawer renders an editable timeline with separate video, text-overlay, and audio tracks. Caption text currently appears as a static text-overlay segment, so users can see the caption but cannot choose a better variant from the drawer timeline itself.

## Approved Approach
Add caption variants to text-overlay timeline segments and expose them through a compact dropdown inside the drawer text-overlay bar. Selecting a caption updates the segment text in place while preserving the same timing and leaving video/audio tracks untouched.

## Alternatives Considered
- Selected-segment action panel: easier to build, but less discoverable because the caption choices are detached from the caption track.
- Whole caption block as menu trigger: visually cleaner, but conflicts with the existing click-to-select timeline behavior.

## Acceptance Criteria
- Caption segments can define multiple selectable caption strings.
- The drawer text-overlay segment shows a dropdown affordance when caption options exist.
- Choosing an option updates the visible caption immediately.
- Existing timeline segment selection, clip swaps, missing-shot fill, and scrubber behavior continue to work.

## Verification
- Run focused timeline assembly tests for the dropdown behavior.
- Run the app-level test that opens the drawer and selects a caption.
- Run `npm run typecheck` because the timeline segment contract changes.
