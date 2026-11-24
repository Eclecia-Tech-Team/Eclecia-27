# Eclecia'27: project handoff

Everything someone needs to pick this project up: what it is, how it runs, what's done, what changed, and what's still open.
Last updated **22 Nov 2026**, branch `wip-events-and-profile`.

Related docs: [DESIGN.md](DESIGN.md) (landing concept and choreography), [client/README.md](client/README.md) (scene config, asset pipeline), [tasks/lessons.md](tasks/lessons.md) (mistakes not to repeat).

---

## 1. What this is

Website for **Eclecia'27**, the annual cultural fest of Heritage Institute of Technology, Kolkata (15–17 January 2027). It has:

- a scroll-driven landing page (black-and-gold eclipse, Indian art forms);
- an **events atlas** (seven "worlds", ~30 events) and a page per event;
- **participant accounts**: register, login (email+password with email OTP, optional Google), profile, festival pass QR;
- **event registration**: solo, team create/join/leave, paid events;
- an **admin panel** at `/admin` to run all of it: events, notices, registrations, check-in, results, mail, staff.

Repo: `git@github.com:Eclecia-Tech-Team/Eclecia-27.git`. The default/integration branch is `feat--staging`; `main` is production. This work is on `wip-events-and-profile` (branched from `feat--staging` at `a581462`).

## 2. Stack

| | |
|---|---|
| Framework | Next.js **16.3** (App Router, Turbopack). **Breaking changes vs older Next**: `params`/`searchParams` are Promises; `middleware` is now `proxy.ts`. Docs ship in `client/node_modules/next/dist/docs/`. Read them before writing Next code (see `client/AGENTS.md`). |
| UI | React 19, Tailwind v4 (tokens in `styles/globals.css`: `--gold #d9a441`, `--parchment #ece4d2`) |
| Data | MongoDB via mongoose 8 (`lib/mongoose.ts`, cached connection, 8 s server-selection timeout) |
| Auth (participants) | NextAuth v5 beta, JWT sessions, Credentials + optional Google (`auth.ts`) |
| Auth (admin panel) | Separate: own `AdminUser` collection, HMAC-signed cookie, password + email OTP (`lib/admin/`) |
| Mail | Resend (`lib/auth-mail.ts`). Without `RESEND_API_KEY`, dev logs mails to the server console; production refuses to start sending. |
| Package manager | Bun (`bun install`, `bun run …`) |
| Other libs | `zod` (validation), `bcryptjs`, `jsqr` (QR scanning at the gate), `qrcode` (drawing the pass QR on the device) |

## 3. Running it

```bash
cd client
cp env.example .env.local      # then fill it in (see below)
bun install
bun run dev                    # http://localhost:3000
```

Scripts (`client/package.json`):

| Command | What |
|---|---|
| `bun run dev` / `build` / `start` / `lint` | usual |
| `bun run seed:categories` | upsert the seven worlds' copy into `atlascategories` (safe to re-run) |
| `bun run seed:events` | **insert-only**: adds line-up events missing from Mongo, never touches existing ones. `--sync-copy` overwrites name/kind/description/clubs/artwork from `constants/events.ts`; `--reset` drops and re-creates (refused once any registration exists). |
| `bun run admin:add <email> [admin\|volunteer\|viewer]` | add or re-role a panel account from the terminal (`--list` to see them) |
| `bun run notice <slug\|all> "<title>" "<body>" [info\|update\|important] [--pin] [--expires=YYYY-MM-DD]` | post a notice from the terminal (`--list`, `--remove <id>`). The panel does the same. |

### Environment (`client/.env.local`, never committed)

| Var | Needed | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Staging Atlas cluster URI lives in the team's `.env.local`. Database `eclecia`. |
| `AUTH_SECRET` | yes | Signs participant sessions, admin sessions (unless `ADMIN_SESSION_SECRET`), and pass QRs. **Changing it invalidates every pass QR and session.** |
| `NEXT_PUBLIC_SITE_URL` | yes in prod | canonical URLs, sitemap, links in emails and admin invites |
| `RESEND_API_KEY`, `MAIL_FROM` | yes in prod | `MAIL_FROM` must be on a domain verified in Resend |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | optional | hides "Continue with Google" when empty |
| `AUTH_TRUST_HOST=true` | self-hosting | outside Vercel |
| `NEXT_PUBLIC_ENABLE_REGISTRATION` | flag | `true` opens `/login`, `/register` **and** event registration. Off: auth pages show "coming soon", event pages say "Opening soon", register APIs refuse. |
| `NEXT_PUBLIC_ENABLE_LOADER` | flag | opening loader on `/` (first visit per tab) |
| `NEXT_PUBLIC_DATES_REVEALED` | flag | landing shows dates |
| `ADMIN_MASTER_KEY` | optional | break-glass panel sign-in (for the very first invite). Long and random. Remove once real admins exist. |
| `ADMIN_SESSION_SECRET` | optional | separate signing secret for panel cookies |

## 4. Map of the code (`client/`)

```
app/
  page.tsx                 landing (scroll scene; config in constants/scene.config.ts)
  events/page.tsx          events atlas (desktop engine + mobile atlas)
  events/[id]/page.tsx     one event (id = slug or Mongo id)
  (auth)/login, register   participant auth (gated by NEXT_PUBLIC_ENABLE_REGISTRATION)
  profile/                 participant profile: details, avatar, my events, my teams, pass QR
  sponsors, team, our-tale   (team/our-tale are "coming soon")
  schedule/                day-wise programme from the structured schedule fields (lib/schedule.ts, components/schedule/)
  admin/login              panel sign-in
  admin/(panel)/…          panel pages (layout checks the session)
  api/auth/*               register, OTP verify/resend, signin-check, forgot/reset password, NextAuth
  api/registration/*       solo, team create/join/leave, my-events (+ withdraw), my-teams (+ update, remove member)
  api/events/*             public event JSON (legacy: nothing in the frontend calls it now)
  api/admin/registrations/export   CSV download
  sitemap.ts, robots.ts    sitemap includes every event page; robots disallows /admin, /api/, /profile
components/
  events/                  atlas (EventsAtlas, MobileEventsAtlas, atlas/engine.ts) and detail/ (event page)
  admin/                   panel UI (one file per screen, shared bits in ui.tsx)
  emails/                  HTML email templates (all text slots escaped via esc())
  common/                  Header, Footer, GoldButton, Meteors, PointerDepth, RouteCurtain, loader/
  profile/                 profile tabs, PassQr
lib/
  models/                  mongoose models (see §5)
  admin/                   access.ts (roles), session.ts, audit.ts, queries.ts, actions/*.ts ("use server")
  events.ts                atlas data (Mongo + constants), eventLookup(), invalidateAtlas()
  event-page.ts            everything the event page renders
  registration.ts          shared checks for register routes, registrationLive()
  otp-session-store.ts     OTPs in Mongo (scoped: participant vs admin)
  qr-token.ts              signed pass QR payloads
constants/                 events.ts (atlas line-up + art), event-categories.ts, assets.ts (Cloudinary), seo.ts, scene.config.ts
scripts/                   seed-events, seed-categories, add-admin, post-notice
```

## 5. Data model (MongoDB)

| Collection | Model | Notes |
|---|---|---|
| `events` | `Events.ts` | `slug` (unique, URL), `eventName` (3–30, unique), `category` (one of the seven world names, see `constants/event-categories.ts`), `kind`, description, `scheduleDate` ("2027-01-16"), `startTime`/`endTime` ("14:30", fest time IST), `venueId` (from `VENUES` in `constants/schedule.ts`, which also sets the schedule's venue order), duration/venue (display strings derived on save); day/time text is built from the structured fields when read (`whenText` in `constants/schedule.ts`), `rules: string[]` (**10–12 per event, often multi-line**), clubs, pocs, team sizes, `teamLimit`, paid/fees, prizePool, `isActive` (registration open), food settings, `banner` (artwork URL). |
| `atlascategories` | `AtlasCategory.ts` | world copy (name, kind, line, image) |
| `users` | `User.ts` | participants. `roles: string[]` exists but is unused (staff are in `adminusers`). Profile complete = username, email, fullName, phone, college, stream. |
| `registrations` | `Registrations.ts` | one per person per event (unique index `{eventId, participant}`). `verified` (free = true at once; paid = after payment), `checkedIn`, `checkedInAt`, `checkedInBy` (AdminUser) + `checkedInByEmail`, `foodServedCount`, `lastFoodServedAt`, `teamId`. |
| `teams` | `Team.ts` | `teamCode` (`ECL-XXXX`), `teamLeader`, `team: User[]` (includes leader), `paymentStatus` (paid events only). |
| `eventnotices` | `EventNotice.ts` | per event or fest-wide (`eventId: null`), tone, pinned, `expiresAt` |
| `eventresults` | `EventResult.ts` | one per event: ordered podium `entries`, `isPublished` (shown on the event page) |
| `adminusers` | `AdminUser.ts` | panel accounts: role, areas (custom role), password hash, `sessionVersion` |
| `adminactions` | `AdminAction.ts` | activity log, auto-deleted after 180 days |
| `otpsessions` | `OtpSession.ts` | pending email codes (TTL), keyed by email + device, 5 wrong tries max |
| `loginthrottles` | `LoginThrottle.ts` | admin sign-in failure counters (TTL) |

**Event ids matter**: registrations, teams, notices and results point at `events._id`. Never drop/re-insert events on a live database (this is why `seed:events` is insert-only).

## 6. Features and how they work

### Events atlas (`/events`)
- World copy comes from `atlascategories` (falls back to constants); events come from Mongo, ordered by the canonical line-up, then panel-added events by name. Empty database → shows the constant line-up.
- Cached per server instance for 60 s (`lib/events.ts`); admin edits call `invalidateAtlas()` (other instances catch up within a minute).
- Artwork: `Event.banner` URL, else bundled `/assets/opt/events/<world>/<slug>.webp`, else (panel-added event with no art) the plain planet.

### Event page (`/events/[slug]`)
Hero with art, facts grid, **Results** (once published), **Notices**, **Rules** (first 5, then "Show all N rules"), full rulebook link, registration card (sticky on desktop, first on phones), coordinators (tap-to-call), more events from the same world.

### Participant registration
- Must be signed in with a complete profile (otherwise redirected to `/profile?returnTo=…` and back).
- Solo: one click. Team: create (gets a code) or join with a code; atomic join respects max size; leaders can disband when alone; members can leave; paid teams lock after payment.
- Paid events: registrations start unverified; staff mark payment in the panel. **There is no online payment gateway**: payment is collected offline and recorded by staff.
- Confirmation email on register.

### Festival pass
Profile → "Pass QR": a signed `eclecia-profile:<userId>:<hmac>` payload drawn as an SVG on the device (no third-party QR service). Scanned at the gate.

### Admin panel (`/admin`)
Sign-in: email + password, then a 6-digit emailed code. Invited people choose their password on first sign-in (saved only after the code checks out).

| Screen | Does |
|---|---|
| Overview | accounts, registrations, verified %, checked in, teams, 14-day sign-ups/registrations, registrations per event |
| Events | list with open/close switch; editor for every field, rules editor (reorder, paste a numbered list), coordinators, artwork preview, food; delete (only when closed and empty) |
| Notices | per event or fest-wide; info/update/important; pin; auto-hide date |
| Registrations | filter by event/status, search (name, email, phone, team code), verify (solo), team payment (paid teams; verifies all members, needs min team size), check-in, food count, CSV export |
| Participants | search, complete/incomplete filter, fix profile typos |
| Check-in | phone-first QR scanner (camera), Entry / Food modes, live "N of M verified are in", Undo, "No pass? find by name/email/phone" |
| Results | podium per event (picks registered teams/people), draft or publish → shows on event page |
| Mail | audience = one event's registrants (verified only or all) / incomplete profiles / every account / pasted emails; `{{name}} {{event}} {{team}} {{teamCode}}`; live preview; confirm with count |
| Admins | invite, change role, reset password (also signs them out), remove; **Recent activity** log |

Roles (`lib/admin/access.ts`):

| Role | Can |
|---|---|
| admin | everything, including managing admins |
| volunteer | check-in desk only |
| viewer | read everything except mail and check-in; change nothing |
| custom | full control of the picked areas (events, notices, registrations, checkin, participants, mail, results) |
| master (key) | like admin; meant only for the first invite |

Every server action re-checks the role on the server (`guard()` in `lib/admin/session.ts`); the UI only hides what a role can't do.

### Panel security model
- Cookie `ecl_admin`: HMAC-SHA256, HttpOnly, SameSite=Strict, Secure in prod, 12 h. Holds `{id, sessionVersion}`. The admin is re-read from Mongo on every request, so role changes and removal apply at once. Sign-out and password reset bump `sessionVersion` (kills every device). Master-key sessions are tied to the key (rotating it ends them).
- Sign-in throttled per email+IP (5 fails / 15 min) and per IP (30 / 15 min) in Mongo, never per account (strangers can't lock a volunteer out). Unknown emails get the same reply and timing. Code emails ≥ 30 s apart per inbox. OTP: 5 wrong tries.
- Check-in and food writes are conditional updates (two desks can't double-admit or double-feed). Manual check-in refuses unverified registrations. Verifying a payment needs registrations rights even when bundled with a check-in.
- Emails escape every name/title; mail placeholders can't inject HTML. CSV export neutralises formulas.

## 7. Changelog

### This branch, `wip-events-and-profile`: profile, pass, header, auth redesign (22 Nov 2026)
- **Profile** rebuilt: festival pass (foil card, tear-off stub with QR) + editorial details with completion meter; ruled Events / Teams lists; restyled dialogs. `?tab=events|teams` opens a tab.
- **Pass images** (`lib/pass-image.ts`, canvas): *Save pass* = 1200×1872 PNG with QR (gallery backup for the gate); *Share* = 1080×1920 story card **without** the QR. Phones use the native share sheet (image only); desktops get Copy image / Download / Copy caption.
- **Username editing** with live availability (`GET /api/user/username`), case-insensitive uniqueness, reserved staff-looking names blocked (also at sign-up and for Google handles), race → 409.
- **Header**: one account control (foil-ringed crest, name on desktop) opening a menu: Profile & pass, My events, My teams, Sign out. Sign out also in the phone drawer. Fixed the duplicate icon on desktop.
- **Sign out** always lands on `/` (`lib/sign-out.ts`; auth.ts's redirect callback was bouncing it to /login).
- **Auth page** redesigned: foil card, editorial header, serif tabs, underline fields, gold submit bar; art panel composed from the wordmark, eclipse, mirrored banners anchored to it, sky + gold dust, veena / mudra hand.
- Bug fixed: email sign-up assigned avatars 1–10 but the model allows 1–7 (~30% of registrations failed).

### This branch, `wip-events-and-profile` (19–22 Nov 2026), not yet merged
**Admin panel (new)**, ported from Dakshh's and rebuilt:
- AdminUser model, roles/areas, signed sessions, password + OTP sign-in, master key, `admin:add` script.
- Screens: overview, events (+ rules editor), notices, registrations (+ CSV), participants, check-in (QR + manual + undo + headcount), results, mail, admins (+ activity log).
- Dakshh behaviour **not** ported: Among Us roles, in-memory OTPs (broken on serverless), AI mail drafts (needs a Gemini key), super-admin seed, PWA install.

**Audit fixes** (independent review + extended browser tests, 22 Nov):
- Volunteers could verify payments by bundling `verified` with a check-in → each field now authorised separately.
- Participant names were injected raw into email HTML → all email text slots escaped; placeholder fill can't expand `$&`; profile name/college/stream length + character limits.
- Manual check-in skipped the "verified" requirement → refused.
- Password lockout and OTP tries were not atomic, lockout was per account (DoS) and leaked which emails are staff → Mongo throttle per email+IP / IP, constant-time reply, atomic OTP tries, code-send cooldown.
- Sessions couldn't be revoked → `sessionVersion` (sign-out, password reset).
- Free↔paid toggle after registrations corrupted verification → locked once anyone registers (like solo↔team).
- Per-member verify on paid teams drifted from team payment → team payment is the only switch; refuses below min team size; badge "needs N more".
- Concurrent scans could double-admit/double-feed → conditional updates.
- Desk name search missed registrants behind 200 common matches → searches only the event's registrants.
- Delete raced with new registrations → only closed events; re-checks after delete.
- Last admin could be demoted; results showed in typed order; `checkedInBy` pointed at the wrong collection; viewers saw a create form; repeated query params crashed pages; custom roles saw fest-wide numbers → all fixed.
- Pass QR: no hardcoded fallback secret, constant-time compare; drawn locally instead of via api.qrserver.com (which also leaked passes to a third party and needed internet at the gate).
- `seed:events` used to **drop the events collection** (would orphan every registration) → insert-only by default.
- Registration now honours `NEXT_PUBLIC_ENABLE_REGISTRATION` on event pages and APIs, not just the auth pages.
- Sitemap lists every event; robots keeps crawlers off `/admin`, `/api/`, `/profile`.
- Opening loader no longer plays on `/admin`.
- Mail sends pace Resend batches and back off on rate limits; partial failures say how many went out.
- Fixed the 9 lint errors already in the repo (`bun run lint`: 0 errors).

**Event pages (new)**: full `/events/[id]` page (hero, facts, notices, rules, registration card, coordinators, siblings); team/solo registration APIs with atomic joins; notices model + CLI; rules list collapses after 5 (events carry 10–12 rules); profile `returnTo` flow.

**Background**: realistic blurred meteors on every page; mouse-driven depth (parallax) on every page except the landing.

### Earlier (on `feat--staging`)
- 21 Nov `a581462` events page and data revamp; 20 Nov auth done, email templates; 19 Nov dashboard/profile revamp, profile page and event registration.
- 18 Nov loader sun fix; 1–3 Nov events atlas (mobile fixes, transitions, categories rename, sponsors update).
- 30–31 Oct events moved from constants into Mongo (`/events` reads Mongo, hash routes removed), auth pages, go-live of the landing (`8636f01`).
- 28–29 Oct loader and landing scene work.

## 8. Testing done

On a throwaway Docker Mongo (`mongo:7` on port 27018) with an isolated copy of the app (never the staging DB), headless Chrome via puppeteer:

- **Panel, happy path**: sign-in (password + code), events edit (12 rules via paste), create event, notices, verify, team payment, CSV, participant filter, results publish → visible on event page, mail send (dev log), invite, volunteer redirect to check-in, manual check-in.
- **Extended (29 checks, all pass)**:
  - Access: master key (wrong and right); viewer refused writes on the server (handler invoked directly, past the UI); custom role limited to its area.
  - Check-in: QR scan through a **fake camera** (entry, undo, re-admit, duplicate, food, food limit); desk headcount.
  - Editor guards: fee required for paid events, team shrink, paid toggle lock.
  - Delete leads to a 404; password reset revokes the session; removal revokes at once; activity log; logout.
  - Abuse limits: sign-in throttle, code cooldown; anonymous and forged-cookie CSV export get 401.
- Email escaping checked with a hostile name; pass QR renders locally (no qrserver requests); sitemap and robots output; `seed:events` re-run is a no-op and `--reset` refuses with registrations.
- `npx tsc --noEmit` clean, `bun run lint` 0 errors (9 `<img>`/hooks warnings in older profile code), `next build` succeeds.

**Not tested**: real camera on a real phone (needs HTTPS: fine on the deployed site, `localhost` works too), real Resend delivery and its rate limits on your plan, Google sign-in, behaviour with thousands of rows.

## 9. Open holes and risks

Ordered by how much they'd hurt.

1. **No online payments.** Paid events rely on staff marking payment in the panel. If a gateway is wanted (Razorpay etc.), it's a separate piece of work: webhook → set team `paymentStatus`/registration `verified`.
2. **Pass QRs never expire and carry no photo.** A screenshot of someone's pass works at the gate. Mitigations if needed: show the profile avatar/college on the desk result (cheap), rotating time-based QR (bigger).
3. **No offline mode at the gate.** Scanning needs network. Plan venue Wi-Fi/mobile data for check-in desks; the manual lookup is the fallback.
4. **Mass mail is synchronous and not resumable.** A send runs inside one request (`maxDuration` 300 s on the mail page; check the hosting plan allows it). Capped at 5,000 recipients. If it stops midway the error says how many went out, but there's no "resume". For very large sends, split the audience.
5. **Viewer role sees phone numbers/emails** (registrations, participants, CSV). Intended for coordinators; give it out accordingly.
6. **Throttling trusts `x-forwarded-for`.** Correct on Vercel/most proxies. If self-hosted without a proxy that sets it, all clients share one bucket.
7. **Atlas cache is per server instance** (≤ 60 s staleness after admin edits on other instances).
8. **Participant-side audit** (from the earlier work, not re-audited in depth here): participant OTP routes share one OTP slot per email+device between "verify" and "reset" flows; `api/events/*` routes are no longer called by the frontend and can be removed once nothing external depends on them.
9. **Lint warnings**: `<img>` instead of `next/image` and one hooks-deps warning in profile code (harmless, cosmetic).
10. **Content gaps**: `/team`, `/our-tale` are "coming soon"; `VENUES` in `constants/schedule.ts` is empty until organisers confirm the venues (until then each event's venue is typed, and the schedule lists venues busiest first); most events have date/venue "TBA", no rules yet; root `README.md` route table is outdated (this file is current).

## 10. Fest-day runbook

1. Before: set `NEXT_PUBLIC_ENABLE_REGISTRATION=true`, open events in **Admin → Events**, post notices. Remove `ADMIN_MASTER_KEY` once admins exist.
2. Invite desk volunteers as **Volunteer** (Admins → Invite). They sign in on their phone at `/admin/login` and land on Check-in.
3. Desk: pick event → Start scanning → participant opens Profile → Pass QR. Green = in. Amber = already in. Red = not registered / not verified / food limit. Wrong scan → Undo. No phone → "No pass? find them by name".
4. Payments at the counter: **Registrations** → filter event → set team payment "Paid" (teams) or switch Verified (solo).
5. After an event: **Results** → add places → Publish (appears on the event page). Mail winners or everyone from **Mail**.
6. Anything odd: **Admins → Recent activity** shows who changed what.

## 11. Conventions

- Commit messages: short, funny, lowercase; commit to the current branch; no AI attribution lines (team preference).
- Never commit `.env*` files or secrets. Credentials live only in `client/.env.local`.
- Don't modify the shared staging database for tests: use a throwaway Docker Mongo.
- UI copy: plain, short, human. Gold for emphasis; mono uppercase for labels.
- Debug rendering bugs from code + screenshots first (see `tasks/lessons.md`).
