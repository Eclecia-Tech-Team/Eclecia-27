# Contributing to Eclecia'27

Welcome to the tech team. This repo is the website for Eclecia'27, HITK's annual cultural fest, 15–17 January 2027. Thousands of people are going to open it on their phones, register for events through it, and get scanned in at the gate with it. So yeah, it matters, and it's also genuinely fun to work on.

This doc is the stuff you need before your first PR. Read it once properly, then keep it handy.

> For the full project picture (data model, every feature, what's done, what's open), read [HANDOFF.md](HANDOFF.md). For why the site looks the way it does, read [DESIGN.md](DESIGN.md). Both are worth 15 minutes of your life.

---

## The stack, quickly

- **Next.js 16** (App Router) + **React 19** + **Tailwind v4**, all inside `client/`
- **MongoDB** via mongoose, **NextAuth v5** for participant accounts, **Resend** for email
- **Bun** as the package manager

**Heads up: this is not the Next.js from your YouTube tutorials.** v16 changed things: `params` and `searchParams` are Promises, `middleware` is now `proxy.ts`, and more. The real docs ship inside the repo at `client/node_modules/next/dist/docs/`. When something "should work" and doesn't, check there before you spend an hour on Stack Overflow answers from 2023.

## Getting it running

```bash
cd client
bun install
cp env.example .env.local
bun run dev          # http://localhost:3000
```

For `.env.local`:

- **Use your own local database, not staging.** Easiest is Docker:
  ```bash
  docker run -d --name eclecia-mongo -p 27017:27017 mongo:7
  ```
  then set `MONGODB_URI=mongodb://localhost:27017/eclecia` and seed it:
  ```bash
  bun run seed:categories
  bun run seed:events
  ```
- `AUTH_SECRET`: anything long and random (`openssl rand -hex 32`).
- Leave `RESEND_API_KEY` empty. Emails (OTPs and so on) then get printed in your terminal instead of being sent. Very handy.
- Set `NEXT_PUBLIC_ENABLE_REGISTRATION=true` if you need login and register to work locally.

Ask me if you get stuck on setup. Don't suffer silently for a day; that helps nobody.

## How we work

### Branches

- **`feat--staging`** is where everything lands. Branch off it, open your PR into it.
- **`main`** is production. **Never open a PR into `main`.** I merge staging into main when it's ready.
- Name your branch after what it does: `feat/team-page`, `fix/schedule-mobile`, `ui/event-page`.

```bash
git checkout feat--staging && git pull
git checkout -b feat/team-page
```

### Picking up work

- Every task is a GitHub issue. Comment "taking this" (or get assigned) before you start, so two people don't build the same page.
- One issue per PR. Keep PRs focused; a 40-file PR that also "fixes some stuff" won't get reviewed fast.
- Open a **draft PR early**, even when it's half done. Seeing work in progress beats a surprise reveal on day 12.

### Commits

Short, lowercase, and they should say what changed. Being funny is allowed (it's tradition at this point), being vague isn't.

- ✅ `team page grid works on phones now`
- ✅ `schedule groups events by day, tba ones go last`
- ❌ `changes`, `fix`, `final`, `final final`

### Before you open (or un-draft) a PR

```bash
cd client
bun run lint
npx tsc --noEmit
```

Both should be clean for the files you touched. Then actually look at your page:

- **Phone width (~390px)** and **desktop (~1440px)**. Most of our traffic is phones; a page that only works on your laptop isn't done.
- Real-ish content: long names, empty states, ten items instead of two.
- Put **screenshots or a short screen recording** in the PR. Phone and desktop both.

The PR template will remind you of all this.

## Design: the short version

The site has a very specific vibe: **black, gold, Indian art forms, an eclipse, theatre**. It should feel premium and handmade, not like a template.

- **Colours:** near-black backgrounds, gold `#d9a441` for emphasis, parchment `#ece4d2` for text. They're already Tailwind colours: `text-gold`, `text-parchment`, `bg-black`.
- **Type:** `font-display` (Cormorant) for headings, Geist Sans for body text, Geist Mono for small uppercase labels. Use `font-taiganja` and `font-nasyhama` sparingly; they're loud.
- **Copy:** plain and human. "The eclipse", never "the moon". No space or sci-fi talk; the fest is about performance and culture. No emojis in the UI. If a sentence sounds like an AI wrote it ("Embark on a celestial journey…"), rewrite it.
- **Reuse what exists:** `SiteHeader`, `SiteFooter`, `PageFade`, `TransitionLink`, `GoldButton`, `Meteors`, `depth()` (the mouse-parallax background). Look at `/events/[slug]`, `/profile` and `/sponsors` for how pages are put together.
- **Assets:** we have a lot of art already (see `constants/assets.ts` and `public/assets/opt/`). New images go up as **WebP**, preferably on Cloudinary. Don't commit 5 MB PNGs.
- **Motion:** subtle. Respect `prefers-reduced-motion`.

Within all that, **be creative**. I'm not going to hand you a Figma file for everything; I want to see what you come up with. If you're unsure about a direction, post a screenshot in the group before you polish it for three days.

## Please don't touch (without talking to me first)

- Auth, registration and payment logic: `auth.ts`, `app/api/auth/*`, `app/api/registration/*`, `lib/registration.ts`
- The admin panel: `app/admin/*`, `lib/admin/*`
- Database models: `lib/models/*`. If you need a new field, ask, because a wrong migration on a live database is a very bad evening
- The landing page scene (`app/page.tsx`, `constants/scene.config.ts`). It's choreographed; read DESIGN.md first
- New dependencies. Ask before `bun add`-ing anything. Most things don't need a library

And obviously: **never commit `.env*` files, keys, passwords or database URLs.** If you accidentally do, tell me immediately. It's fixable if we're fast, and nobody will be mad. They'll only be mad if you hide it.

## Getting help

Ask in the tech team group, or tag me on your PR or issue. Asking "is this the right approach?" early is a strength, not a weakness. Reviews will have comments; that's normal and it's how everyone gets better, me included.

Now go build something people will remember.
