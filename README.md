# Eclecia ’26 

Website for **Eclecia**, the annual cultural fest of Heritage Institute of Technology, Kolkata.
A scroll-driven, single-scene landing page built around a black-and-gold eclipse and Indian art forms, plus sponsorship and placeholder pages.

- **Design rationale and decisions:** [DESIGN.md](DESIGN.md)
- **Developer docs (config reference, asset pipeline, how-tos):** [client/README.md](client/README.md)
- **New to the team? Start here:** [CONTRIBUTING.md](CONTRIBUTING.md)

## Repository layout

```
eclecia_v2/
├─ README.md            ← you are here
├─ DESIGN.md            ← concept, choreography, what we tried and dropped
└─ client/              ← Next.js 16 app (App Router, Tailwind v4, Bun)
   ├─ app/              ← pages, scene engine, config
   ├─ public/assets/opt ← optimised WebP assets served to users
   ├─ assets-src/       ← original PNG/SVG sources (not served)
   └─ scripts/          ← asset optimisation
```

## Quick start

```bash
cd client
bun install
bun run dev        # http://localhost:3000
```

Other scripts: `bun run build`, `bun run start`, `bun run lint`, `node scripts/optimize-assets.mjs`.

## Routes

| Route | What |
|---|---|
| `/` | Landing: pinned scroll scene → hero, stats, events, dusk, finale |
| `/events`, `/events/[slug]` | Events atlas and one page per event (notices, rules, registration, results) |
| `/login`, `/register`, `/profile` | Participant accounts, festival pass QR |
| `/sponsors` | Sponsorship page |
| `/admin` | Admin panel (events, notices, registrations, check-in, results, mail, staff) |
| `/schedule`, `/team`, `/our-tale` | Coming soon |

**Full, current project handoff (setup, env, data model, features, changelog, open issues): [HANDOFF.md](HANDOFF.md).**

## Status

- Desktop and mobile/portrait layouts done.
- Dates deliberately not shown anywhere yet (pre-reveal).
- Events, registration and the admin panel are built; see HANDOFF.md for status and open issues.
- Brochure button on `/sponsors` expects `client/public/eclecia-26-brochure.pdf`.
