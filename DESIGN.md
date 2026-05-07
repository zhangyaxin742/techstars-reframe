# Reframe - Design Reference
> Founders who have a product, but no audience.

**Theme:** split system

Reframe's design system is intentionally split across three surfaces:

- A cinematic landing and waitlist flow with warm editorial type, dark imagery, and restrained gold accents.
- A light workspace built for structure, clarity, and operational confidence.
- A high-contrast trend studio with louder motion energy and more theatrical display moments.

The common thread is not a single visual treatment. It is a founder-marketing point of view: serious enough to feel strategic, warm enough to feel human, and sharp enough to make AI output feel directed rather than generic.

## Implementation Status

These findings came from grepping the current codebase:

- [app/layout.tsx](/C:/Users/user/Documents/GitHub/techstars-reframe/app/layout.tsx:1) currently loads `Cormorant_Garamond` into `--font-display`.
- [app/layout.tsx](/C:/Users/user/Documents/GitHub/techstars-reframe/app/layout.tsx:1) currently loads `Instrument_Sans` into `--font-sans`.
- [components/trending/trending-page-shell.tsx](/C:/Users/user/Documents/GitHub/techstars-reframe/components/trending/trending-page-shell.tsx:1) currently loads `Bungee` for the trend-studio hero title.

Design intent going forward:

- The two typographic tokens should be `EB Garamond` and `Instrument Sans`.
- If a new spec needs a default font decision, default to those intended fonts in the design language.
- Do not resolve the code-level mismatch without explicit permission.

That permission gate matters. This file should document the intended Reframe system, not silently approve replacing current font imports or utility mappings.

## Brand Direction

Reframe should feel like an AI CMO, not a generic SaaS dashboard:

- Editorial, not corporate.
- Strategic, not playful.
- Warm, not sterile.
- Composed, not ornamental.

The landing page can feel cinematic. The workspace should feel precise and calm. The trend studio can feel more amplified, but it still needs to look like part of the same product family.

## Tokens - Color

The product already has two active palettes: a warm brand palette and a cooler workspace palette. Keep both.

| Name | Value | Token | Role |
|------|-------|-------|------|
| Ink | `#1a160e` | `--ink` | Landing background, dark overlays, primary dark canvas |
| Cream | `#f5efe0` | `--cream` | Landing text, light controls on dark surfaces |
| Gold | `#c9a84c` | `--gold` | Warm accent, emphasis, focus and CTA moments |
| Warm | `#e8d5b0` | `--warm` | Secondary hero copy and softer text on dark surfaces |
| Background | `hsl(220 20% 98%)` | `--color-background` | Workspace canvas |
| Foreground | `hsl(224 22% 12%)` | `--color-foreground` | Workspace primary text |
| Card | `hsl(0 0% 100%)` | `--color-card` | Workspace cards and panels |
| Secondary | `hsl(220 16% 94%)` | `--color-secondary` | Soft UI surfaces and controls |
| Muted | `hsl(220 14% 93%)` | `--color-muted` | Recessed areas and low-emphasis fills |
| Muted Foreground | `hsl(220 9% 42%)` | `--color-muted-foreground` | Helper text and labels |
| Accent | `hsl(201 96% 32%)` | `--color-accent` | Workspace active state, links, selected UI |
| Border | `hsl(220 13% 88%)` | `--color-border` | Hairlines, dividers, inputs |

### Surface Rules

- Landing: use `--ink`, `--cream`, `--gold`, and `--warm` as the primary language.
- Workspace: use `--color-background`, `--color-card`, `--color-foreground`, `--color-muted`, and `--color-accent`.
- Trending: stay in near-black space with warm gold and amber highlights. It can borrow from landing warmth, but should remain darker and more electric.

## Tokens - Typography

### Intended Font Tokens

| Font | Intended Token | Role |
|------|----------------|------|
| `EB Garamond` | `--font-display` | Primary brand typography. Default for headlines, wordmarks, hero copy, and other moments that need warmth and authority. |
| `Instrument Sans` | `--font-sans` | Primary UI and operational typography. Use for body copy, labels, controls, dashboard content, and the trend-studio title if the loud display treatment is normalized into the core system. |

### Current Implementation Exceptions

- `--font-display` is still backed by `Cormorant_Garamond` in code.
- Functional UI body text is already backed by `Instrument_Sans` in code.
- The trend studio title currently uses `Bungee`, but that should be treated as legacy implementation rather than an approved long-term exception.

Do not flatten those exceptions by default. Ask permission before changing imports, Tailwind mappings, or component-level overrides.

### Type Rules

- Use `EB Garamond` for the Reframe wordmark, hero headlines, section headlines, and strategic copy that carries the brand voice.
- Use `Instrument Sans` for body copy, navigation, controls, operational content, and trend-studio titling when a bold sans treatment is needed without introducing a third font.
- If a design spec does not name a font, default to these two intended tokens.
- Keep line lengths moderate. Reframe copy should read like deliberate editorial product writing, not dense documentation.
- Preserve `tabular-nums tracking-tight` for metrics, counts, and timeline timings.

### Suggested Scale

| Role | Size | Line Height | Tracking |
|------|------|-------------|----------|
| Overline | 11px-12px | 1.3 | `0.18em` to `0.34em` |
| Body | 15px-16px | 1.5-1.65 | `0` to `-0.01em` |
| Subheading | 18px-24px | 1.2-1.35 | `-0.02em` |
| Heading | 32px-48px | 0.95-1.05 | `-0.04em` |
| Hero Display | `clamp(3.2rem, 9vw, 7.8rem)` | 0.9-0.95 | `-0.045em` to `0.02em` |

## Tokens - Spacing, Radius, Elevation

### Spacing

- Base unit: `4px`
- Common steps: `4`, `8`, `12`, `16`, `24`, `32`, `40`, `64`

### Radius

- Compact UI: `0.375rem`, `0.5rem`, `0.75rem`
- Landing cards and fields: `1.2rem`, `1.6rem`, `2rem`
- Trend studio panels: `28px`, `30px`, `36px`

### Elevation

- Workspace cards should feel crisp and low-noise.
- Landing glass surfaces can use blur, soft borders, and deeper shadow.
- Trend studio panels can use stronger shadow and bloom because that surface already supports theatrical contrast.

Reference shadows already present in the product:

- `--shadow`: `rgba(26, 22, 14, 0.7)`
- `phone`: `0 40px 80px rgba(26, 22, 14, 0.6)`
- `glass-panel`: inset highlight plus deep ambient shadow

## Surface Patterns

### Landing / Waitlist

- Use full-bleed imagery, warm tinting, grain, and vignette overlays.
- Keep the composition centered and cinematic.
- Prefer cream text over pure white.
- Gold should read as a warm signal, not a luxury gimmick.
- Glass pills and glass panels are valid here because they already exist in the interface language.

### Workspace

- Use light cards on a pale structured canvas.
- Keep components compact, legible, and operational.
- Favor tokenized neutrals over bespoke one-off colors.
- This surface should feel like an intelligent tool, not a marketing site.

### Trending Studio

- Use near-black backgrounds, studio-grid texture, warm radial light, and rounded glass panels.
- Large display type is allowed here, but it should be built from `Instrument Sans` or `EB Garamond`, not a third injected display font.
- Motion, audio states, and hover behavior can be more expressive than in the workspace.
- The surface should feel like a live signal board for creator behavior.

## Components

### Wordmark

- Lowercase `reframe.`
- Treated as editorial, not geometric.
- Use the primary display token in normal weight with generous letterspacing only where already established.

### Hero Headline

- Large serif headline with tight tracking and short lines.
- Use italic emphasis selectively for one or two words, not whole sentences.
- Copy should feel declarative and founder-specific.

### Waitlist Modal

- Dark card on dark scrim.
- Cream body text, gold eyebrow, serif headline.
- Rounded, soft, and quiet rather than hard-edged.

### Workspace Cards

- Use `bg-card` / `bg-background` token language.
- Keep borders and fills subtle.
- Numeric and operational content should stay highly legible and aligned.

### Trend Tiles

- Rounded media cards with dark overlays, small uppercase metadata, and stronger hover/focus feedback.
- Warm highlight borders are acceptable here because they match the existing trend-studio language.

## Do

- Treat Reframe as a product for founders making audience strategy decisions, not a general AI playground.
- Keep the landing warm and cinematic, the workspace calm and precise, and the trend studio high-contrast and energetic.
- Default written design specs to `EB Garamond` and `Instrument Sans`.
- Preserve existing surface-specific behavior before introducing new visual motifs.
- Use accent color intentionally. In the workspace it is functional; on dark surfaces it is atmospheric or directional.

## Do Not

- Do not refer to this system as General Intelligence Company.
- Do not silently replace current font imports or component font overrides without approval.
- Do not apply landing gradients and glass treatments indiscriminately to the workspace.
- Do not make the workspace ornamental or visually noisy.
- Do not let the trend studio drift into a separate unrelated brand.

## Agent Prompt Guide

Use this framing when generating Reframe UI:

1. Start by identifying the surface: landing, workspace, or trend studio.
2. Apply the correct palette before choosing components.
3. Default typography in design language to `EB Garamond` and `Instrument Sans`.
4. Treat current code-level font usage as an implementation exception unless the user explicitly approves a migration.

Example prompt:

```text
Create a Reframe landing hero for founders with a product but no audience. Use a dark ink background, cream editorial serif type, gold accent restraint, grain and vignette overlays, and a centered cinematic composition. Default typography to EB Garamond and Instrument Sans in the spec, but do not assume code-level font migration has been approved.
```

## Quick Start

```css
:root {
  --ink: #1a160e;
  --cream: #f5efe0;
  --gold: #c9a84c;
  --warm: #e8d5b0;

  --color-background: hsl(220 20% 98%);
  --color-foreground: hsl(224 22% 12%);
  --color-card: hsl(0 0% 100%);
  --color-secondary: hsl(220 16% 94%);
  --color-muted: hsl(220 14% 93%);
  --color-muted-foreground: hsl(220 9% 42%);
  --color-accent: hsl(201 96% 32%);
  --color-border: hsl(220 13% 88%);

  /* Intended design tokens. Ask permission before remapping code to them. */
  --font-display: "EB Garamond", Georgia, serif;
  --font-sans: "Instrument Sans", system-ui, sans-serif;
}
```
