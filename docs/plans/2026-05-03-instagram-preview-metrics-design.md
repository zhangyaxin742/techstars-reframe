# Instagram Preview Metrics Design

## Context
The preview node currently shows an Instagram publishing state with a progress bar and then only two published metrics: views and likes. That state proves the publish handoff, but it does not feel close enough to the compact performance summary a founder would expect from Instagram insights.

## Approved Approach
Keep the card compact and restrained, but make the published state read more like a mini insights summary. Views becomes the hero metric. Likes, saves, and shares become smaller support metrics with distinct icons and tinted chips. A secondary summary row adds reach plus a derived engagement-rate signal so the card communicates distribution and response, not just vanity counts.

## Alternatives Considered
- Keep the current two-metric layout and only add color: cheaper, but it still under-represents the analytics story.
- Build a denser Instagram-native insights panel: more realistic, but too heavy for the preview node and likely noisy inside the canvas.

## Acceptance Criteria
- Publishing state remains compact and keeps the existing progress treatment.
- Published state promotes views as the top metric.
- Published state includes distinct supporting metrics for likes, saves, and shares.
- Published state includes secondary summary values for reach and engagement rate.
- Existing publish animation and viewport focus behavior continue to work.

## Verification
- Run the focused app test covering preview publish progress and published metrics.
- Run `npm run typecheck` because the publish-state contract changes.
