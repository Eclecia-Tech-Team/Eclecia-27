# Mobile events — approved Chakra Dial

The phone experience uses one illustrated category at a time, a rotating engraved chakra frame, neighboring previews, seven category shortcuts, and a searchable directory of all 30 events. Inside a category, swipe through events or use the event stops and next-event preview. Pentathlon remains a shayari competition.

The mobile component is selected at viewport widths of 760px and below. The existing desktop markup, engine, orbit positioning, and desktop stylesheet are preserved. Crossing the breakpoint cleans up the previous scene. The shared site header, event data, and existing illustration assets are reused.

## Files

- `approved-chakra-concept.png`: approved Concept A reference.
- `chakra-frame-source.png`: transparent frame generated with ImageGen.
- `chakra-frame-prompt.txt`: exact generation prompt.
- `review/mobile-categories.png` and `review/mobile-event.png`: implemented phone views at 390 × 844.
- `review/desktop-preserved.png`: existing desktop scene after breakpoint switching.
- `../../client/components/events/MobileEventsAtlas.tsx`: mobile interactions and markup.
- `../../client/styles/mobile-events.css`: isolated mobile styling.
- `../../client/scripts/prepare-mobile-events.mjs`: rebuild the transparent production frame and 37 category/event thumbnails using Sharp (`bun scripts/prepare-mobile-events.mjs` from `client`).

## Motion and accessibility

Pointer dragging updates a single DOM transform rather than rendering React state on every move. Vertical touch gestures remain available for scrolling. Category navigation wraps; event navigation has bounded ends and an explicit path back to other categories. Keyboard arrows, semantic buttons, live category/event copy, native modal dialogs, focus restoration, and reduced-motion preferences are supported. No continuous animation loop runs on phones.

## Verification

- ESLint on both atlas React components: passed.
- TypeScript (`tsc --noEmit --incremental false`): passed.
- Production build: passed (existing metadataBase warning remains).
- Browser review at 320 × 568, 375 × 667, 390 × 844, 430 × 932, and the 760px mobile breakpoint.
- Verified category and event swipes, category entry, event stops, last-event exit, details dialog, complete 30-event directory, and shayari search selecting Pentathlon.
- Resizing back to desktop restores the original atlas. Desktop engine, solar-system positioning, and desktop stylesheet hashes are unchanged from the start of this work.
- No browser warning/error logs during review. Real-device Safari testing remains useful before release.
