# Todo

## Plan

- [x] Add events data layer (`client/lib/events.ts`).
- [x] Serve `/events` from Mongo, with an error state.
- [x] Remove hash routes and detail dialogs; Discover goes to `/events/[id]`.
- [x] Add `/events/[id]` coming soon page.
- [x] Restore category + event on return from an event page.

## Verification

- [x] `npx tsc --noEmit`, `npx eslint` (client)
- [x] `npm run build -- --webpack` with no `MONGODB_URI`
- [x] `scripts/seed-events.ts` on throwaway Docker Mongo: 30 inserted
- [x] Production build in headless Brave, 1440x900 + 390x844, no console errors:
  - category opens in place, URL stays `/events`, no hash
  - Discover lands on `/events/<slug>`, coming soon shown
  - back + "Back to events" restore same category + event
  - unknown id: 404
  - Mongo down: error state in ~8s; Try again recovers

## Review

### Changed

- `/events` reads events from Mongo per request. World copy and order still come from `constants/events.ts`.
- Fixed `/api/events/[id]` 12-character slug bug (`general-quiz`, `storytelling`) via shared `eventLookup`.
- Mongo connect timeout is now 8s.

### Risks

- No `client/.env.local`: `/events` errors until `MONGODB_URI` is set and events seeded. Real DB not touched.
- Spot clears only via All categories, so leaving by Discover then returning through nav reopens the category.
- Events sort by name now, not the old editorial order.

### Follow-ups

- Registration/teams/payments and admin panel from dakshh not ported.
- Sitemap has no event URLs.
